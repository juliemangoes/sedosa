"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import type { DayInterval, WeeklyHours, FieldType } from "@/db/schema";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import {
  BookingError,
  cancelBooking,
  confirmDeposit,
  createBooking,
  recordPayment,
  rescheduleBooking,
} from "@/lib/booking";
import { appUrl, stripeEnabled } from "@/lib/env";
import { notifyBooked, notifyCancelled, notifyRescheduled } from "@/lib/notify";
import { getSettings, saveSettings, settingsSchema } from "@/lib/settings";
import { chargeSavedCard } from "@/lib/stripe";
import { parseHHMM } from "@/lib/availability";
import { deleteMedia } from "@/lib/media";
import { applyOptIn, markSentManually, waNumber, scheduleAutoReminder, scheduleManual, syncReminders } from "@/lib/whatsapp";

// ---------------------------------------------------------------------------
// helpers

function back(path: string, kind: "notice" | "error", msg: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`);
}

async function baseUrl() {
  if (process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL) return appUrl();
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const int = (fd: FormData, k: string, def = 0) => {
  const n = Number.parseInt(str(fd, k), 10);
  return Number.isFinite(n) ? n : def;
};
const ids = (fd: FormData, k: string) => fd.getAll(k).map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);

/** "$25", "25.00", "25" → 2500 */
function cents(fd: FormData, k: string): number {
  const v = str(fd, k).replace(/[$,\s]/g, "");
  if (!v) return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new BookingError("invalid", `Invalid amount for ${k}.`);
  return Math.round(n * 100);
}

/** <input type="datetime-local"> value interpreted in the studio's time zone. */
function localDateTime(value: string, zone: string): Date {
  const dt = DateTime.fromISO(value, { zone });
  if (!dt.isValid) throw new BookingError("invalid", "Enter a valid date and time.");
  return dt.toJSDate();
}

/** "9:30-20:00, 21:00-22:00" or "9:30am-8pm" → intervals. Empty → closed. */
async function parseHours(text: string): Promise<DayInterval[]> {
  const out: DayInterval[] = [];
  const toHHMM = (raw: string) => {
    const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(raw.trim());
    if (!m) throw new BookingError("invalid", `Can't read the time "${raw}". Use e.g. 09:30-20:00.`);
    let h = Number(m[1]);
    const min = Number(m[2] ?? 0);
    const ap = m[3]?.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    const s = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    parseHHMM(s);
    return s;
  };
  for (const part of text.split(",").map((p) => p.trim()).filter(Boolean)) {
    const [a, b] = part.split(/\s*[-–]\s*/);
    if (!a || !b) throw new BookingError("invalid", `Can't read "${part}". Use start-end, e.g. 09:30-20:00.`);
    const iv = { start: toHHMM(a), end: toHHMM(b) };
    if (parseHHMM(iv.end) <= parseHHMM(iv.start)) throw new BookingError("invalid", `"${part}" ends before it starts.`);
    out.push(iv);
  }
  return out.sort((x, y) => parseHHMM(x.start) - parseHHMM(y.start));
}

async function run(path: string, fn: () => Promise<string | void>) {
  await requireAdmin();
  let msg: string | void;
  try {
    msg = await fn();
  } catch (e) {
    if (e instanceof BookingError) back(path, "error", e.message);
    // redirect() throws a special error that must propagate
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    back(path, "error", "Something went wrong saving that change.");
  }
  revalidatePath("/admin", "layout");
  back(path, "notice", msg || "Saved.");
}

// ---------------------------------------------------------------------------
// auth

const attempts = new Map<string, { n: number; until: number }>();

export async function loginAction(_: { error?: string } | undefined, fd: FormData): Promise<{ error?: string }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rec = attempts.get(ip);
  if (rec && rec.until > Date.now()) return { error: "Too many attempts. Try again in a few minutes." };
  if (!checkPassword(str(fd, "password"))) {
    const n = (rec?.n ?? 0) + 1;
    attempts.set(ip, { n, until: n >= 5 ? Date.now() + 5 * 60_000 : 0 });
    await new Promise((r) => setTimeout(r, 400));
    return { error: "That password isn't right." };
  }
  attempts.delete(ip);
  await startSession();
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// appointments

export async function setStatusAction(fd: FormData) {
  const id = str(fd, "id");
  const status = str(fd, "status") as "completed" | "no_show" | "confirmed";
  await run(`/admin/appointments/${id}`, async () => {
    if (!["completed", "no_show", "confirmed"].includes(status)) throw new BookingError("invalid", "Unknown status.");
    const db = await getDb();
    await db.update(t.appointments).set({ status, holdExpiresAt: null, updatedAt: new Date() }).where(eq(t.appointments.id, id));
    await syncReminders(db, id);
    return status === "no_show" ? "Marked as no-show." : status === "completed" ? "Marked as completed." : "Restored to confirmed.";
  });
}

export async function cancelAppointmentAction(fd: FormData) {
  const id = str(fd, "id");
  await run(`/admin/appointments/${id}`, async () => {
    const db = await getDb();
    const appt = await cancelBooking(db, id, { actor: "admin", reason: str(fd, "reason") });
    if (bool(fd, "notify")) await notifyCancelled(db, appt, await baseUrl(), "admin");
    await syncReminders(db, id);
    return "Appointment canceled.";
  });
}

export async function markDepositAction(fd: FormData) {
  const id = str(fd, "id");
  await run(`/admin/appointments/${id}`, async () => {
    const db = await getDb();
    if (str(fd, "mode") === "waive") {
      await db
        .update(t.appointments)
        .set({ depositStatus: "waived", status: sql`case when ${t.appointments.status} = 'pending' then 'confirmed' else ${t.appointments.status} end`, holdExpiresAt: null, updatedAt: new Date() })
        .where(eq(t.appointments.id, id));
      return "Deposit waived.";
    }
    const method = str(fd, "method") as "cash" | "cashapp" | "zelle" | "card" | "other";
    const { newlyConfirmed, appointment } = await confirmDeposit(db, id, { method });
    if (newlyConfirmed) await notifyBooked(db, appointment, await baseUrl());
    return "Deposit recorded.";
  });
}

export async function recordPaymentAction(fd: FormData) {
  const id = str(fd, "id");
  await run(`/admin/appointments/${id}`, async () => {
    const db = await getDb();
    const amountCents = cents(fd, "amount");
    if (amountCents <= 0) throw new BookingError("invalid", "Enter an amount.");
    await recordPayment(db, id, {
      kind: str(fd, "kind") as "balance" | "tip" | "no_show_fee" | "late_fee" | "other",
      method: str(fd, "method") as "cash" | "cashapp" | "zelle" | "card" | "other",
      amountCents,
      note: str(fd, "note"),
    });
    return "Payment recorded.";
  });
}

export async function chargeCardAction(fd: FormData) {
  const id = str(fd, "id");
  await run(`/admin/appointments/${id}`, async () => {
    if (!stripeEnabled()) throw new BookingError("state", "Stripe is not configured.");
    const db = await getDb();
    const appt = await db.query.appointments.findFirst({ where: eq(t.appointments.id, id) });
    if (!appt) throw new BookingError("not_found", "Appointment not found.");
    const amountCents = cents(fd, "amount");
    if (amountCents <= 0) throw new BookingError("invalid", "Enter an amount.");
    await chargeSavedCard(db, appt, str(fd, "kind") as "no_show_fee" | "late_fee" | "balance", amountCents);
    return `Charged $${(amountCents / 100).toFixed(2)} to the card on file.`;
  });
}

export async function rescheduleAction(fd: FormData) {
  const id = str(fd, "id");
  await run(`/admin/appointments/${id}`, async () => {
    const db = await getDb();
    const settings = await getSettings(db);
    const start = localDateTime(str(fd, "startsAt"), settings.timezone);
    const loc = str(fd, "locationId");
    const { before, appointment } = await rescheduleBooking(db, id, {
      startsAt: start.toISOString(),
      locationId: loc ? Number(loc) : "any",
      actor: "admin",
      force: bool(fd, "force"),
    });
    if (bool(fd, "notify")) await notifyRescheduled(db, appointment, before.startsAt, await baseUrl(), "admin");
    await syncReminders(db, id);
    return "Appointment moved.";
  });
}

export async function saveAdminNotesAction(fd: FormData) {
  const id = str(fd, "id");
  await run(`/admin/appointments/${id}`, async () => {
    const db = await getDb();
    await db.update(t.appointments).set({ adminNotes: str(fd, "adminNotes").slice(0, 5000), updatedAt: new Date() }).where(eq(t.appointments.id, id));
    return "Notes saved.";
  });
}

export async function resendConfirmationAction(fd: FormData) {
  const id = str(fd, "id");
  await run(`/admin/appointments/${id}`, async () => {
    const db = await getDb();
    const appt = await db.query.appointments.findFirst({ where: eq(t.appointments.id, id) });
    if (!appt) throw new BookingError("not_found", "Appointment not found.");
    await notifyBooked(db, appt, await baseUrl());
    return "Confirmation re-sent.";
  });
}

export async function createAppointmentAction(fd: FormData) {
  await requireAdmin();
  const db = await getDb();
  let id = "";
  try {
    const settings = await getSettings(db);
    const start = localDateTime(str(fd, "startsAt"), settings.timezone);
    const loc = str(fd, "locationId");
    const { appointment } = await createBooking(db, {
      serviceId: int(fd, "serviceId"),
      locationId: loc ? Number(loc) : "any",
      addonIds: ids(fd, "addonIds"),
      startsAt: start.toISOString(),
      client: {
        firstName: str(fd, "firstName"),
        lastName: str(fd, "lastName"),
        email: str(fd, "email"),
        phone: str(fd, "phone"),
        smsOptIn: bool(fd, "smsOptIn"),
        whatsappOptIn: bool(fd, "whatsappOptIn"),
      },
      answers: {},
      clientNotes: str(fd, "clientNotes"),
      bookedBy: "admin",
      onlineDeposit: false,
      force: bool(fd, "force"),
    });
    id = appointment.id;
    const deposit = str(fd, "deposit");
    if (appointment.depositCents > 0 && deposit === "waived") {
      await db.update(t.appointments).set({ depositStatus: "waived" }).where(eq(t.appointments.id, id));
    } else if (appointment.depositCents > 0 && ["cash", "cashapp", "zelle", "card"].includes(deposit)) {
      await confirmDeposit(db, id, { method: deposit as "cash" });
    }
    const fresh = (await db.query.appointments.findFirst({ where: eq(t.appointments.id, id) }))!;
    if (bool(fd, "notify")) await notifyBooked(db, fresh, await baseUrl());
    else {
      const client = await db.query.clients.findFirst({ where: eq(t.clients.id, fresh.clientId) });
      if (client) await scheduleAutoReminder(db, fresh, client, settings);
    }
  } catch (e) {
    if (e instanceof BookingError) {
      const detail = e.fieldErrors ? ` ${Object.values(e.fieldErrors).join(" ")}` : "";
      back("/admin/appointments/new", "error", e.message + detail);
    }
    throw e;
  }
  revalidatePath("/admin", "layout");
  back(`/admin/appointments/${id}`, "notice", "Appointment booked.");
}

// ---------------------------------------------------------------------------
// clients

export async function updateClientAction(fd: FormData) {
  const id = int(fd, "id");
  await run(`/admin/clients/${id}`, async () => {
    const db = await getDb();
    const email = str(fd, "email").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BookingError("invalid", "Enter a valid email.");
    const dupe = await db.query.clients.findFirst({ where: eq(t.clients.email, email) });
    if (dupe && dupe.id !== id) throw new BookingError("invalid", "Another client already uses that email.");
    const { normalizePhone } = await import("@/lib/format");
    await db
      .update(t.clients)
      .set({
        firstName: str(fd, "firstName"),
        lastName: str(fd, "lastName"),
        email,
        phone: normalizePhone(str(fd, "phone")),
        smsOptIn: bool(fd, "smsOptIn"),
        whatsappOptIn: bool(fd, "whatsappOptIn"),
        notes: str(fd, "notes").slice(0, 5000),
      })
      .where(eq(t.clients.id, id));
    await applyOptIn(db, id, await getSettings(db));
  });
}

// ---------------------------------------------------------------------------
// services & categories

export async function saveServiceAction(fd: FormData) {
  await requireAdmin();
  const db = await getDb();
  const id = int(fd, "id");
  const path = id ? `/admin/services/${id}` : "/admin/services/new";
  let savedId = id;
  try {
    const values = {
      name: str(fd, "name"),
      categoryId: int(fd, "categoryId"),
      description: str(fd, "description"),
      durationMin: int(fd, "durationMin"),
      priceCents: cents(fd, "price"),
      depositCents: cents(fd, "deposit"),
      paddingBeforeMin: int(fd, "paddingBeforeMin"),
      paddingAfterMin: int(fd, "paddingAfterMin"),
      active: bool(fd, "active"),
      private: bool(fd, "private"),
      sortOrder: int(fd, "sortOrder"),
    };
    if (!values.name) throw new BookingError("invalid", "Name is required.");
    if (values.durationMin < 5) throw new BookingError("invalid", "Duration must be at least 5 minutes.");
    if (!values.categoryId) throw new BookingError("invalid", "Choose a category.");
    const locationIds = ids(fd, "locationIds");
    const addonIds = ids(fd, "addonIds");
    const formIds = ids(fd, "formIds");
    await db.transaction(async (tx) => {
      if (id) await tx.update(t.services).set(values).where(eq(t.services.id, id));
      else savedId = (await tx.insert(t.services).values(values).returning())[0].id;
      await tx.delete(t.serviceLocations).where(eq(t.serviceLocations.serviceId, savedId));
      await tx.delete(t.serviceAddons).where(eq(t.serviceAddons.serviceId, savedId));
      await tx.delete(t.serviceForms).where(eq(t.serviceForms.serviceId, savedId));
      if (locationIds.length) await tx.insert(t.serviceLocations).values(locationIds.map((locationId) => ({ serviceId: savedId, locationId })));
      if (addonIds.length) await tx.insert(t.serviceAddons).values(addonIds.map((addonId) => ({ serviceId: savedId, addonId })));
      if (formIds.length) await tx.insert(t.serviceForms).values(formIds.map((formId) => ({ serviceId: savedId, formId })));
    });
  } catch (e) {
    if (e instanceof BookingError) back(path, "error", e.message);
    throw e;
  }
  revalidatePath("/", "layout");
  back(`/admin/services/${savedId}`, "notice", "Service saved.");
}

export async function deleteServiceAction(fd: FormData) {
  const id = int(fd, "id");
  await requireAdmin();
  const db = await getDb();
  const used = await db.select({ id: t.appointments.id }).from(t.appointments).where(eq(t.appointments.serviceId, id)).limit(1);
  if (used.length) {
    await db.update(t.services).set({ active: false }).where(eq(t.services.id, id));
    revalidatePath("/", "layout");
    back(`/admin/services/${id}`, "notice", "This service has appointment history, so it was turned off instead of deleted.");
  }
  await db.delete(t.services).where(eq(t.services.id, id));
  revalidatePath("/", "layout");
  back("/admin/services", "notice", "Service deleted.");
}

export async function saveCategoryAction(fd: FormData) {
  await run("/admin/services", async () => {
    const db = await getDb();
    const id = int(fd, "id");
    const name = str(fd, "name");
    if (!name) throw new BookingError("invalid", "Category name is required.");
    const sortOrder = int(fd, "sortOrder");
    const description = str(fd, "description").slice(0, 140);
    if (id) await db.update(t.categories).set({ name, sortOrder, description }).where(eq(t.categories.id, id));
    else await db.insert(t.categories).values({ name, sortOrder, description });
    revalidatePath("/", "layout");
    return "Category saved.";
  });
}

export async function removeCategoryImageAction(fd: FormData) {
  await run("/admin/services", async () => {
    const db = await getDb();
    const cat = await db.query.categories.findFirst({ where: eq(t.categories.id, int(fd, "id")) });
    if (cat?.imageId) {
      await db.update(t.categories).set({ imageId: null }).where(eq(t.categories.id, cat.id));
      await deleteMedia(db, cat.imageId);
    }
    revalidatePath("/", "layout");
    return "Photo removed.";
  });
}

// ---------------------------------------------------------------------------
// landing photos

export async function saveGalleryAltAction(fd: FormData) {
  await run("/admin/photos", async () => {
    const db = await getDb();
    const id = int(fd, "mediaId");
    const settings = await getSettings(db);
    await saveSettings(db, { galleryPhotos: settings.galleryPhotos.map((p) => (p.mediaId === id ? { ...p, alt: str(fd, "alt").slice(0, 200) } : p)) });
    revalidatePath("/", "layout");
    return "Description saved.";
  });
}

export async function moveGalleryPhotoAction(fd: FormData) {
  await run("/admin/photos", async () => {
    const db = await getDb();
    const id = int(fd, "mediaId");
    const dir = str(fd, "dir") === "up" ? -1 : 1;
    const list = [...(await getSettings(db)).galleryPhotos];
    const i = list.findIndex((p) => p.mediaId === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await saveSettings(db, { galleryPhotos: list });
    revalidatePath("/", "layout");
    return "Order saved.";
  });
}

export async function removeGalleryPhotoAction(fd: FormData) {
  await run("/admin/photos", async () => {
    const db = await getDb();
    const id = int(fd, "mediaId");
    const settings = await getSettings(db);
    if (!settings.galleryPhotos.some((p) => p.mediaId === id)) return;
    await saveSettings(db, { galleryPhotos: settings.galleryPhotos.filter((p) => p.mediaId !== id) });
    await deleteMedia(db, id);
    revalidatePath("/", "layout");
    return "Photo removed.";
  });
}

export async function deleteCategoryAction(fd: FormData) {
  await run("/admin/services", async () => {
    const db = await getDb();
    const id = int(fd, "id");
    const has = await db.select({ id: t.services.id }).from(t.services).where(eq(t.services.categoryId, id)).limit(1);
    if (has.length) throw new BookingError("state", "Move or delete this category's services first.");
    await db.delete(t.categories).where(eq(t.categories.id, id));
    return "Category deleted.";
  });
}

// ---------------------------------------------------------------------------
// add-ons

export async function saveAddonAction(fd: FormData) {
  await run("/admin/addons", async () => {
    const db = await getDb();
    const id = int(fd, "id");
    const values = {
      name: str(fd, "name"),
      durationMin: int(fd, "durationMin"),
      priceCents: cents(fd, "price"),
      active: bool(fd, "active"),
      sortOrder: int(fd, "sortOrder"),
    };
    if (!values.name) throw new BookingError("invalid", "Name is required.");
    if (id) await db.update(t.addons).set(values).where(eq(t.addons.id, id));
    else await db.insert(t.addons).values(values);
    return "Add-on saved.";
  });
}

export async function deleteAddonAction(fd: FormData) {
  await run("/admin/addons", async () => {
    const db = await getDb();
    await db.delete(t.addons).where(eq(t.addons.id, int(fd, "id")));
    return "Add-on deleted.";
  });
}

// ---------------------------------------------------------------------------
// forms

export async function saveFormAction(fd: FormData) {
  await requireAdmin();
  const db = await getDb();
  const id = int(fd, "id");
  const name = str(fd, "name");
  if (!name) back(id ? `/admin/forms/${id}` : "/admin/forms", "error", "Form name is required.");
  let savedId = id;
  const values = { name, description: str(fd, "description"), sortOrder: int(fd, "sortOrder") };
  if (id) await db.update(t.forms).set(values).where(eq(t.forms.id, id));
  else savedId = (await db.insert(t.forms).values(values).returning())[0].id;
  revalidatePath("/", "layout");
  back(`/admin/forms/${savedId}`, "notice", "Form saved.");
}

export async function deleteFormAction(fd: FormData) {
  await requireAdmin();
  const db = await getDb();
  await db.delete(t.forms).where(eq(t.forms.id, int(fd, "id")));
  revalidatePath("/", "layout");
  back("/admin/forms", "notice", "Form deleted.");
}

const FIELD_TYPES: FieldType[] = ["yesno", "checkbox", "checkboxlist", "dropdown", "text", "textarea"];

export async function saveFieldAction(fd: FormData) {
  const formId = int(fd, "formId");
  await run(`/admin/forms/${formId}`, async () => {
    const db = await getDb();
    const id = int(fd, "id");
    const type = str(fd, "type") as FieldType;
    if (!FIELD_TYPES.includes(type)) throw new BookingError("invalid", "Unknown question type.");
    const options = str(fd, "options")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if ((type === "checkboxlist" || type === "dropdown") && options.length < 2) {
      throw new BookingError("invalid", "Add at least two options (one per line).");
    }
    const values = { formId, type, label: str(fd, "label"), options, required: bool(fd, "required"), sortOrder: int(fd, "sortOrder") };
    if (!values.label) throw new BookingError("invalid", "Question text is required.");
    if (id) await db.update(t.formFields).set(values).where(and(eq(t.formFields.id, id), eq(t.formFields.formId, formId)));
    else await db.insert(t.formFields).values(values);
    return "Question saved.";
  });
}

export async function deleteFieldAction(fd: FormData) {
  const formId = int(fd, "formId");
  await run(`/admin/forms/${formId}`, async () => {
    const db = await getDb();
    await db.delete(t.formFields).where(and(eq(t.formFields.id, int(fd, "id")), eq(t.formFields.formId, formId)));
    return "Question deleted.";
  });
}

// ---------------------------------------------------------------------------
// availability

export async function saveLocationAction(fd: FormData) {
  await run("/admin/availability", async () => {
    const db = await getDb();
    const id = int(fd, "id");
    const weeklyHours: WeeklyHours = {};
    for (let d = 1; d <= 7; d++) weeklyHours[String(d)] = await parseHours(str(fd, `hours_${d}`));
    const values = { name: str(fd, "name"), address: str(fd, "address"), active: bool(fd, "active"), sortOrder: int(fd, "sortOrder"), weeklyHours };
    if (!values.name) throw new BookingError("invalid", "Location name is required.");
    if (id) await db.update(t.locations).set(values).where(eq(t.locations.id, id));
    else {
      const [loc] = await db.insert(t.locations).values(values).returning();
      // Offer every active service at the new location by default.
      const svcs = await db.select({ id: t.services.id }).from(t.services);
      if (svcs.length) await db.insert(t.serviceLocations).values(svcs.map((s) => ({ serviceId: s.id, locationId: loc.id })));
    }
    revalidatePath("/", "layout");
    return "Hours saved.";
  });
}

export async function addOverrideAction(fd: FormData) {
  await run("/admin/availability", async () => {
    const db = await getDb();
    const date = str(fd, "date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BookingError("invalid", "Pick a date.");
    const intervals = bool(fd, "closed") ? [] : await parseHours(str(fd, "hours"));
    if (!bool(fd, "closed") && !intervals.length) throw new BookingError("invalid", "Enter hours, or tick Closed.");
    const loc = str(fd, "locationId");
    const locIds = loc === "all" ? (await db.select({ id: t.locations.id }).from(t.locations)).map((l) => l.id) : [Number(loc)];
    for (const locationId of locIds) {
      await db
        .insert(t.dateOverrides)
        .values({ locationId, date, intervals, note: str(fd, "note") })
        .onConflictDoUpdate({ target: [t.dateOverrides.locationId, t.dateOverrides.date], set: { intervals, note: str(fd, "note") } });
    }
    return "Special hours saved.";
  });
}

export async function deleteOverrideAction(fd: FormData) {
  await run("/admin/availability", async () => {
    const db = await getDb();
    await db.delete(t.dateOverrides).where(eq(t.dateOverrides.id, int(fd, "id")));
    return "Special hours removed.";
  });
}

export async function addTimeOffAction(fd: FormData) {
  await run("/admin/availability", async () => {
    const db = await getDb();
    const settings = await getSettings(db);
    const startsAt = localDateTime(str(fd, "start"), settings.timezone);
    const endsAt = localDateTime(str(fd, "end"), settings.timezone);
    if (endsAt <= startsAt) throw new BookingError("invalid", "End must be after start.");
    const loc = str(fd, "locationId");
    await db.insert(t.timeOff).values({ locationId: loc === "all" ? null : Number(loc), startsAt, endsAt, reason: str(fd, "reason") });
    return "Time blocked off.";
  });
}

export async function deleteTimeOffAction(fd: FormData) {
  await run("/admin/availability", async () => {
    const db = await getDb();
    await db.delete(t.timeOff).where(eq(t.timeOff.id, int(fd, "id")));
    return "Blocked time removed.";
  });
}

// ---------------------------------------------------------------------------
// settings

export async function saveSettingsAction(fd: FormData) {
  await run("/admin/settings", async () => {
    const db = await getDb();
    const current = await getSettings(db);
    const policies: { title: string; body: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const title = str(fd, `policyTitle_${i}`);
      const body = str(fd, `policyBody_${i}`);
      if (title && body) policies.push({ title, body });
    }
    const whatsappTemplates: { label: string; body: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const label = str(fd, `waLabel_${i}`).slice(0, 40);
      const body = str(fd, `waBody_${i}`).slice(0, 1000);
      if (label && body) whatsappTemplates.push({ label, body });
    }
    const parsed = settingsSchema.safeParse({
      ...current,
      businessName: str(fd, "businessName"),
      phone: str(fd, "phone"),
      email: str(fd, "email"),
      instagram: str(fd, "instagram").replace(/^@/, ""),
      facebook: str(fd, "facebook"),
      timezone: str(fd, "timezone") || current.timezone,
      slotIntervalMin: int(fd, "slotIntervalMin", current.slotIntervalMin),
      minNoticeMinutes: Math.round(Number(str(fd, "minNoticeHours") || 0) * 60),
      maxDaysAhead: int(fd, "maxDaysAhead", current.maxDaysAhead),
      rescheduleCutoffHours: int(fd, "rescheduleCutoffHours", current.rescheduleCutoffHours),
      cancelCutoffHours: int(fd, "cancelCutoffHours", current.cancelCutoffHours),
      holdMinutes: int(fd, "holdMinutes", current.holdMinutes),
      sharedStaff: bool(fd, "sharedStaff"),
      noShowFeeCents: cents(fd, "noShowFee"),
      lateCancelFeeCents: cents(fd, "lateCancelFee"),
      reminderHoursBefore: int(fd, "reminderHoursBefore", current.reminderHoursBefore),
      cashAppHandle: str(fd, "cashAppHandle"),
      zelleHandle: str(fd, "zelleHandle"),
      manualDepositInstructions: str(fd, "manualDepositInstructions"),
      locationNote: str(fd, "locationNote"),
      confirmationNote: str(fd, "confirmationNote"),
      policies,
      whatsappNumber: str(fd, "whatsappNumber"),
      whatsappReminders: bool(fd, "whatsappReminders"),
      whatsappReminderHours: int(fd, "whatsappReminderHours", current.whatsappReminderHours),
      whatsappReminderTemplate: str(fd, "whatsappReminderTemplate").slice(0, 1000) || current.whatsappReminderTemplate,
      whatsappTemplates,
    });
    if (!parsed.success) throw new BookingError("invalid", "Some settings are invalid: " + parsed.error.issues.map((i) => i.path.join(".")).join(", "));
    if (!DateTime.local().setZone(parsed.data.timezone).isValid) throw new BookingError("invalid", "Unknown time zone.");
    if (parsed.data.whatsappNumber && !waNumber(parsed.data.whatsappNumber)) throw new BookingError("invalid", "Enter the WhatsApp number with area code (and country code outside the US).");
    await saveSettings(db, parsed.data);
    revalidatePath("/", "layout");
    return "Settings saved.";
  });
}

export async function rotateFeedKeyAction() {
  await run("/admin/settings", async () => {
    const db = await getDb();
    await saveSettings(db, { calendarFeedKey: randomBytes(18).toString("base64url") });
    return "New calendar link created. Re-subscribe with the new link.";
  });
}

// ---------------------------------------------------------------------------
// finance

export async function saveTransactionAction(fd: FormData) {
  const back = str(fd, "back") || "/admin/finance";
  await run(back, async () => {
    const db = await getDb();
    const id = int(fd, "id");
    const kind = str(fd, "kind") === "income" ? "income" : "expense";
    const date = str(fd, "date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BookingError("invalid", "Pick a date.");
    const amountCents = cents(fd, "amount");
    if (amountCents <= 0) throw new BookingError("invalid", "Enter an amount.");
    const category = str(fd, "category") || (kind === "expense" ? "Other" : "Other income");
    const receipt = int(fd, "receiptMediaId");
    const values = {
      kind: kind as "income" | "expense",
      date,
      amountCents,
      category: category.slice(0, 60),
      method: str(fd, "method") || "other",
      description: str(fd, "description").slice(0, 200),
      recurringMonthly: kind === "expense" && bool(fd, "recurringMonthly"),
      receiptMediaId: receipt || null,
    };
    if (id) await db.update(t.transactions).set(values).where(eq(t.transactions.id, id));
    else {
      const [row] = await db.insert(t.transactions).values(values).returning();
      // A new recurring expense is also this month's first entry.
      if (row.recurringMonthly) {
        await db.insert(t.transactions).values({ ...values, recurringMonthly: false, recurringSourceId: row.id });
      }
    }
    return kind === "expense" ? "Expense saved." : "Income saved.";
  });
}

export async function deleteTransactionAction(fd: FormData) {
  const back = str(fd, "back") || "/admin/finance";
  await run(back, async () => {
    const db = await getDb();
    const row = await db.query.transactions.findFirst({ where: eq(t.transactions.id, int(fd, "id")) });
    if (!row) throw new BookingError("not_found", "Entry not found.");
    await db.delete(t.transactions).where(eq(t.transactions.id, row.id));
    await deleteMedia(db, row.receiptMediaId);
    return row.recurringMonthly ? "Recurring expense stopped." : "Entry deleted.";
  });
}

export async function logRecurringAction(fd: FormData) {
  const back = str(fd, "back") || "/admin/finance";
  await run(back, async () => {
    const db = await getDb();
    const settings = await getSettings(db);
    const src = await db.query.transactions.findFirst({ where: and(eq(t.transactions.id, int(fd, "id")), eq(t.transactions.recurringMonthly, true)) });
    if (!src) throw new BookingError("not_found", "Recurring expense not found.");
    const month = DateTime.now().setZone(settings.timezone);
    const day = Math.min(Number(src.date.slice(8, 10)) || 1, month.daysInMonth ?? 28);
    await db.insert(t.transactions).values({
      kind: src.kind,
      date: month.set({ day }).toISODate()!,
      amountCents: src.amountCents,
      category: src.category,
      method: src.method,
      description: src.description,
      recurringMonthly: false,
      recurringSourceId: src.id,
    });
    return `${src.description || src.category} logged for ${month.toFormat("LLLL")}.`;
  });
}

// ---------------------------------------------------------------------------
// WhatsApp

export async function markReminderSentAction(fd: FormData) {
  const back = str(fd, "back") || "/admin";
  await run(back, async () => {
    const db = await getDb();
    await markSentManually(db, int(fd, "id"), await getSettings(db), await baseUrl());
    return "Reminder marked as sent.";
  });
}

export async function scheduleWhatsAppAction(fd: FormData) {
  const id = str(fd, "appointmentId");
  await run(`/admin/appointments/${id}`, async () => {
    const db = await getDb();
    const settings = await getSettings(db);
    const appt = await db.query.appointments.findFirst({ where: eq(t.appointments.id, id) });
    if (!appt) throw new BookingError("not_found", "Appointment not found.");
    const when = str(fd, "when");
    let sendAt: Date;
    if (when === "custom") sendAt = localDateTime(str(fd, "sendAt"), settings.timezone);
    else if (when === "morning") sendAt = DateTime.fromJSDate(appt.startsAt).setZone(settings.timezone).set({ hour: 9, minute: 0, second: 0 }).toJSDate();
    else sendAt = new Date(appt.startsAt.getTime() - Math.max(1, int(fd, "when", 24)) * 3_600_000);
    if (sendAt <= new Date()) throw new BookingError("invalid", "That time has already passed. Pick a later time, or send it now with the WhatsApp button.");
    if (sendAt >= appt.startsAt) throw new BookingError("invalid", "Reminders need to go out before the appointment.");
    const template = str(fd, "template").slice(0, 1000) || settings.whatsappReminderTemplate;
    await scheduleManual(db, id, sendAt, template);
    return `WhatsApp reminder scheduled for ${DateTime.fromJSDate(sendAt).setZone(settings.timezone).toFormat("ccc LLL d, h:mm a")}.`;
  });
}

export async function cancelScheduledAction(fd: FormData) {
  const back = str(fd, "back") || "/admin";
  await run(back, async () => {
    const db = await getDb();
    await db
      .update(t.scheduledMessages)
      .set({ status: "canceled" })
      .where(and(eq(t.scheduledMessages.id, int(fd, "id")), inArray(t.scheduledMessages.status, ["scheduled", "failed"])));
    return "Reminder canceled.";
  });
}
