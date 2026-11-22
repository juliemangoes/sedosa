import { randomBytes } from "node:crypto";
import { DateTime } from "luxon";
import { and, eq, gt, inArray, lt, or, sql, ne, isNull } from "drizzle-orm";
import type { DB } from "@/db";
import * as t from "@/db/schema";
import type { AppointmentSnapshot } from "@/db/schema";
import { loadCatalog, type Catalog, type ServiceDetail } from "./catalog";
import { getSettings, type Settings } from "./settings";
import {
  locationsForStart,
  slotsForRange,
  firstAvailableDate,
  type AvailabilityInput,
  type Busy,
} from "./availability";
import { validateAnswers, type RawAnswers } from "./intake";
import { normalizePhone } from "./format";

export class BookingError extends Error {
  constructor(
    public code: "not_found" | "invalid" | "slot_unavailable" | "policy" | "state",
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

/** Appointment statuses that occupy time on the calendar. */
const BLOCKING = ["confirmed", "completed", "no_show"] as const;
/** All bookings serialize on this lock so two clients can never take the same slot. */
const BOOKING_LOCK = 72_210_501;

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Conn = DB | Tx;

// ---------------------------------------------------------------------------
// Availability

async function loadBusy(
  db: Conn,
  settings: Settings,
  from: Date,
  to: Date,
  now: Date,
  excludeAppointmentId?: string,
): Promise<Busy[]> {
  const appts = await db
    .select({
      id: t.appointments.id,
      locationId: t.appointments.locationId,
      startsAt: t.appointments.startsAt,
      endsAt: t.appointments.endsAt,
      bufferBeforeMin: t.appointments.bufferBeforeMin,
      bufferAfterMin: t.appointments.bufferAfterMin,
    })
    .from(t.appointments)
    .where(
      and(
        lt(t.appointments.startsAt, to),
        gt(t.appointments.endsAt, from),
        or(
          inArray(t.appointments.status, [...BLOCKING]),
          and(eq(t.appointments.status, "pending"), gt(t.appointments.holdExpiresAt, now)),
        ),
        excludeAppointmentId ? ne(t.appointments.id, excludeAppointmentId) : undefined,
      ),
    );
  const off = await db
    .select()
    .from(t.timeOff)
    .where(and(lt(t.timeOff.startsAt, to), gt(t.timeOff.endsAt, from)));

  return [
    ...appts.map((a) => ({
      locationId: settings.sharedStaff ? null : a.locationId,
      start: new Date(a.startsAt.getTime() - a.bufferBeforeMin * 60_000),
      end: new Date(a.endsAt.getTime() + a.bufferAfterMin * 60_000),
    })),
    ...off.map((o) => ({ locationId: o.locationId, start: o.startsAt, end: o.endsAt })),
  ];
}

export type AvailabilityRequest = {
  service: ServiceDetail;
  addonIds: number[];
  /** Restrict to one location, or all the service's locations. */
  locationId: number | "any";
  fromDate: string;
  toDate: string;
  now?: Date;
  excludeAppointmentId?: string;
  /** Owner bookings skip min-notice and the booking window. */
  ignoreNotice?: boolean;
};

export async function buildAvailabilityInput(
  db: Conn,
  catalog: Pick<Catalog, "addons" | "locations">,
  settings: Settings,
  req: AvailabilityRequest,
): Promise<AvailabilityInput> {
  const now = req.now ?? new Date();
  const zone = settings.timezone;
  const addons = catalog.addons.filter((a) => req.addonIds.includes(a.id) && req.service.addonIds.includes(a.id));
  const locIds =
    req.locationId === "any"
      ? req.service.locationIds
      : req.service.locationIds.filter((id) => id === req.locationId);
  const locs = catalog.locations.filter((l) => locIds.includes(l.id) && l.active);

  const from = DateTime.fromISO(req.fromDate, { zone }).minus({ days: 1 }).toJSDate();
  const to = DateTime.fromISO(req.toDate, { zone }).plus({ days: 2 }).toJSDate();
  const [busy, overrides] = await Promise.all([
    loadBusy(db, settings, from, to, now, req.excludeAppointmentId),
    locs.length
      ? db
          .select()
          .from(t.dateOverrides)
          .where(
            and(
              inArray(
                t.dateOverrides.locationId,
                locs.map((l) => l.id),
              ),
              sql`${t.dateOverrides.date} >= ${req.fromDate}`,
              sql`${t.dateOverrides.date} <= ${req.toDate}`,
            ),
          )
      : Promise.resolve([]),
  ]);

  return {
    timezone: zone,
    now,
    slotIntervalMin: settings.slotIntervalMin,
    minNoticeMinutes: req.ignoreNotice ? 0 : settings.minNoticeMinutes,
    maxDaysAhead: req.ignoreNotice ? 365 : settings.maxDaysAhead,
    durationMin: req.service.durationMin + addons.reduce((s, a) => s + a.durationMin, 0),
    paddingBeforeMin: req.service.paddingBeforeMin,
    paddingAfterMin: req.service.paddingAfterMin,
    locations: locs.map((l) => ({
      id: l.id,
      weeklyHours: l.weeklyHours,
      overrides: Object.fromEntries(overrides.filter((o) => o.locationId === l.id).map((o) => [o.date, o.intervals])),
    })),
    busy,
  };
}

/** Week-view availability for the public booking page. */
export async function getAvailability(
  db: DB,
  params: { serviceId: number; locationId: number | "any"; addonIds: number[]; startDate?: string; days: number; excludeAppointmentId?: string },
) {
  // Rescheduling an existing booking works even if the service has since been hidden.
  const rescheduling = !!params.excludeAppointmentId;
  const [catalog, settings] = await Promise.all([loadCatalog(db, { publicOnly: !rescheduling }), getSettings(db)]);
  const service = catalog.services.find((s) => s.id === params.serviceId);
  if (!service) throw new BookingError("not_found", "That service isn't available for online booking.");
  const zone = settings.timezone;
  const today = DateTime.now().setZone(zone).toISODate()!;
  const days = Math.min(Math.max(params.days, 1), 14);

  // Without a start date, jump to the first week that has an opening (like Acuity does).
  let startDate = params.startDate && params.startDate >= today ? params.startDate : today;
  let first: string | null = null;
  if (!params.startDate) {
    const probe = await buildAvailabilityInput(db, catalog, settings, {
      service,
      addonIds: params.addonIds,
      locationId: params.locationId,
      fromDate: today,
      toDate: DateTime.fromISO(today, { zone }).plus({ days: settings.maxDaysAhead }).toISODate()!,
      excludeAppointmentId: params.excludeAppointmentId,
    });
    first = firstAvailableDate(probe, today);
    if (first) startDate = first;
  }
  const endDate = DateTime.fromISO(startDate, { zone }).plus({ days: days - 1 }).toISODate()!;
  const input = await buildAvailabilityInput(db, catalog, settings, {
    service,
    addonIds: params.addonIds,
    locationId: params.locationId,
    fromDate: startDate,
    toDate: endDate,
    excludeAppointmentId: params.excludeAppointmentId,
  });
  return {
    timezone: zone,
    startDate,
    today,
    lastDate: DateTime.fromISO(today, { zone }).plus({ days: settings.maxDaysAhead }).toISODate()!,
    durationMin: input.durationMin,
    dates: slotsForRange(input, startDate, days),
  };
}

// ---------------------------------------------------------------------------
// Create

export type CreateBookingInput = {
  serviceId: number;
  locationId: number | "any";
  addonIds: number[];
  startsAt: string;
  client: { firstName: string; lastName: string; email: string; phone: string; smsOptIn: boolean; whatsappOptIn?: boolean };
  answers: RawAnswers;
  clientNotes?: string;
  bookedBy: "client" | "admin";
  /** True when the deposit will be collected online right now (Stripe). */
  onlineDeposit: boolean;
  /** Owner override: book even outside hours / over another appointment. */
  force?: boolean;
  now?: Date;
};

function snapshotFor(
  service: ServiceDetail,
  addons: Catalog["addons"],
  location: Catalog["locations"][number],
): AppointmentSnapshot {
  return {
    serviceName: service.name,
    categoryName: service.categoryName,
    servicePriceCents: service.priceCents,
    serviceDurationMin: service.durationMin,
    locationName: location.name,
    locationAddress: location.address,
    addons: addons.map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents, durationMin: a.durationMin })),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createBooking(db: DB, input: CreateBookingInput) {
  const now = input.now ?? new Date();
  const isAdmin = input.bookedBy === "admin";
  const [catalog, settings] = await Promise.all([loadCatalog(db, { publicOnly: !isAdmin }), getSettings(db)]);
  const service = catalog.services.find((s) => s.id === input.serviceId);
  if (!service || (!isAdmin && !service.active)) throw new BookingError("not_found", "That service isn't available.");

  // Client details
  const c = input.client;
  const fieldErrors: Record<string, string> = {};
  const firstName = c.firstName?.trim() ?? "";
  const lastName = c.lastName?.trim() ?? "";
  const email = c.email?.trim().toLowerCase() ?? "";
  const phone = normalizePhone(c.phone ?? "");
  if (!firstName) fieldErrors.firstName = "First name is required.";
  if (!lastName) fieldErrors.lastName = "Last name is required.";
  if (!EMAIL.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (!isAdmin && phone.replace(/\D/g, "").length < 10) fieldErrors.phone = "Enter a valid phone number.";

  const addonIds = [...new Set(input.addonIds)];
  if (addonIds.some((id) => !service.addonIds.includes(id))) {
    throw new BookingError("invalid", "One of the selected add-ons isn't offered with this service.");
  }
  const addons = catalog.addons.filter((a) => addonIds.includes(a.id));

  const forms = catalog.forms.filter((f) => service.formIds.includes(f.id));
  const intake = validateAnswers(isAdmin ? forms.map((f) => ({ ...f, fields: f.fields.map((x) => ({ ...x, required: false })) })) : forms, input.answers ?? {});
  Object.assign(fieldErrors, intake.errors);
  if (Object.keys(fieldErrors).length) {
    throw new BookingError("invalid", "Please fix the highlighted fields.", fieldErrors);
  }

  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) throw new BookingError("invalid", "Invalid appointment time.");
  const durationMin = service.durationMin + addons.reduce((s, a) => s + a.durationMin, 0);
  const priceCents = service.priceCents + addons.reduce((s, a) => s + a.priceCents, 0);
  const depositCents = Math.min(service.depositCents, priceCents);
  const zone = settings.timezone;
  const date = DateTime.fromJSDate(start, { zone }).toISODate()!;

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${BOOKING_LOCK})`);

    let locationId: number;
    if (input.force && isAdmin) {
      if (input.locationId === "any") throw new BookingError("invalid", "Choose a location.");
      locationId = input.locationId;
    } else {
      const avail = await buildAvailabilityInput(tx, catalog, settings, {
        service,
        addonIds,
        locationId: input.locationId,
        fromDate: date,
        toDate: date,
        now,
        ignoreNotice: isAdmin,
      });
      const options = locationsForStart(avail, start);
      if (!options.length) {
        throw new BookingError(
          "slot_unavailable",
          isAdmin
            ? "That time isn't open (outside hours, blocked off, or overlapping another booking). Tick the override box to book it anyway."
            : "Sorry, that time was just taken. Please pick another time.",
        );
      }
      locationId = options[0];
    }
    const location = catalog.locations.find((l) => l.id === locationId);
    if (!location) throw new BookingError("invalid", "Unknown location.");

    const [client] = await tx
      .insert(t.clients)
      .values({ firstName, lastName, email, phone, smsOptIn: !!c.smsOptIn, whatsappOptIn: !!c.whatsappOptIn })
      .onConflictDoUpdate({
        target: t.clients.email,
        set: { firstName, lastName, ...(phone ? { phone } : {}), smsOptIn: !!c.smsOptIn, ...(c.whatsappOptIn !== undefined ? { whatsappOptIn: !!c.whatsappOptIn } : {}) },
      })
      .returning();

    const needsOnlinePayment = depositCents > 0 && input.onlineDeposit && !isAdmin;
    const [appointment] = await tx
      .insert(t.appointments)
      .values({
        token: randomBytes(24).toString("base64url"),
        clientId: client.id,
        serviceId: service.id,
        locationId,
        startsAt: start,
        endsAt: new Date(start.getTime() + durationMin * 60_000),
        bufferBeforeMin: service.paddingBeforeMin,
        bufferAfterMin: service.paddingAfterMin,
        status: needsOnlinePayment ? "pending" : "confirmed",
        priceCents,
        depositCents,
        depositStatus: depositCents > 0 ? "due" : "none",
        holdExpiresAt: needsOnlinePayment ? new Date(now.getTime() + settings.holdMinutes * 60_000) : null,
        snapshot: snapshotFor(service, addons, location),
        answers: intake.answers,
        clientNotes: (input.clientNotes ?? "").slice(0, 2000),
        bookedBy: input.bookedBy,
        // Booked inside the reminder window: the confirmation doubles as the reminder.
        reminderSentAt: start.getTime() - now.getTime() < settings.reminderHoursBefore * 3_600_000 ? now : null,
      })
      .returning();

    return { appointment, client, needsOnlinePayment, settings };
  });
}

// ---------------------------------------------------------------------------
// Payments

export async function recordPayment(
  db: Conn,
  appointmentId: string,
  p: { kind: (typeof t.payments.$inferInsert)["kind"]; method: (typeof t.payments.$inferInsert)["method"]; amountCents: number; stripeId?: string; note?: string },
) {
  if (p.stripeId) {
    const dupe = await db.select({ id: t.payments.id }).from(t.payments).where(eq(t.payments.stripeId, p.stripeId));
    if (dupe.length) return false; // webhook retries
  }
  await db.insert(t.payments).values({ appointmentId, ...p, note: p.note ?? "" });
  await db
    .update(t.appointments)
    .set({ amountPaidCents: sql`${t.appointments.amountPaidCents} + ${p.amountCents}`, updatedAt: new Date() })
    .where(eq(t.appointments.id, appointmentId));
  return true;
}

/**
 * Deposit received. Confirms a pending booking. If the hold had already lapsed
 * and someone else took the slot, the booking is still confirmed (the client paid)
 * and flagged for the owner.
 */
export async function confirmDeposit(
  db: DB,
  appointmentId: string,
  p: { method: "stripe" | "cash" | "cashapp" | "zelle" | "card" | "other"; amountCents?: number; stripeId?: string },
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${BOOKING_LOCK})`);
    const appt = await tx.query.appointments.findFirst({ where: eq(t.appointments.id, appointmentId) });
    if (!appt) throw new BookingError("not_found", "Appointment not found.");
    if (appt.depositStatus === "paid") return { appointment: appt, newlyConfirmed: false, conflict: false };

    const inserted = await recordPayment(tx, appt.id, {
      kind: "deposit",
      method: p.method,
      amountCents: p.amountCents ?? appt.depositCents,
      stripeId: p.stripeId,
    });
    if (!inserted) return { appointment: appt, newlyConfirmed: false, conflict: false };

    let conflict = false;
    if (appt.status === "expired") {
      const settings = await getSettings(tx as unknown as DB);
      const clash = await loadBusy(tx, settings, appt.startsAt, appt.endsAt, new Date(), appt.id);
      conflict = clash.some(
        (b) => (b.locationId === null || b.locationId === appt.locationId) && b.start < appt.endsAt && appt.startsAt < b.end,
      );
    }
    const wasPending = appt.status === "pending" || appt.status === "expired";
    const [updated] = await tx
      .update(t.appointments)
      .set({
        depositStatus: "paid",
        ...(wasPending ? { status: "confirmed" as const, holdExpiresAt: null } : {}),
        ...(conflict
          ? { adminNotes: sql`${t.appointments.adminNotes} || ${"\n⚠️ Deposit arrived after the hold expired and this time overlaps another booking. Please contact the client."}` }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(t.appointments.id, appt.id))
      .returning();
    return { appointment: updated, newlyConfirmed: wasPending, conflict };
  });
}

/** Releases holds whose payment window passed. Returns the number released. */
export async function expireStaleHolds(db: DB, now = new Date()) {
  const rows = await db
    .update(t.appointments)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(t.appointments.status, "pending"), lt(t.appointments.holdExpiresAt, now)))
    .returning({ id: t.appointments.id });
  return rows.length;
}

// ---------------------------------------------------------------------------
// Reschedule / cancel

function hoursUntil(d: Date, now: Date) {
  return (d.getTime() - now.getTime()) / 3_600_000;
}

export function clientCanChange(
  appt: { status: string; startsAt: Date },
  settings: Settings,
  kind: "reschedule" | "cancel",
  now = new Date(),
): { ok: true } | { ok: false; reason: string } {
  if (appt.status !== "confirmed") return { ok: false, reason: "This appointment can no longer be changed online." };
  const cutoff = kind === "reschedule" ? settings.rescheduleCutoffHours : settings.cancelCutoffHours;
  if (hoursUntil(appt.startsAt, now) < cutoff) {
    return {
      ok: false,
      reason: `Online ${kind === "reschedule" ? "rescheduling" : "cancellation"} closes ${cutoff} hours before your appointment. Please call or text the studio.`,
    };
  }
  return { ok: true };
}

export async function rescheduleBooking(
  db: DB,
  appointmentId: string,
  p: { startsAt: string; locationId: number | "any"; actor: "client" | "admin"; force?: boolean; now?: Date },
) {
  const now = p.now ?? new Date();
  const [catalog, settings] = await Promise.all([loadCatalog(db), getSettings(db)]);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${BOOKING_LOCK})`);
    const appt = await tx.query.appointments.findFirst({ where: eq(t.appointments.id, appointmentId) });
    if (!appt) throw new BookingError("not_found", "Appointment not found.");
    if (p.actor === "client") {
      const can = clientCanChange(appt, settings, "reschedule", now);
      if (!can.ok) throw new BookingError("policy", can.reason);
    } else if (!["confirmed", "pending"].includes(appt.status)) {
      throw new BookingError("state", "Only upcoming appointments can be rescheduled.");
    }
    const service = catalog.services.find((s) => s.id === appt.serviceId);
    if (!service) throw new BookingError("not_found", "The booked service no longer exists.");
    const addonIds = appt.snapshot.addons.map((a) => a.id);
    const durationMin = Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60_000);
    const start = new Date(p.startsAt);
    if (Number.isNaN(start.getTime())) throw new BookingError("invalid", "Invalid time.");

    let locationId: number;
    if (p.force && p.actor === "admin") {
      locationId = p.locationId === "any" ? appt.locationId : p.locationId;
    } else {
      const date = DateTime.fromJSDate(start, { zone: settings.timezone }).toISODate()!;
      const avail = await buildAvailabilityInput(tx, catalog, settings, {
        service,
        addonIds,
        locationId: p.locationId,
        fromDate: date,
        toDate: date,
        now,
        excludeAppointmentId: appt.id,
        ignoreNotice: p.actor === "admin",
      });
      avail.durationMin = durationMin; // keep the originally booked length
      const options = locationsForStart(avail, start);
      if (!options.length) throw new BookingError("slot_unavailable", "That time isn't available. Please pick another.");
      locationId = options.includes(appt.locationId) ? appt.locationId : options[0];
    }
    const location = catalog.locations.find((l) => l.id === locationId)!;
    const [updated] = await tx
      .update(t.appointments)
      .set({
        startsAt: start,
        endsAt: new Date(start.getTime() + durationMin * 60_000),
        locationId,
        snapshot: { ...appt.snapshot, locationName: location.name, locationAddress: location.address },
        reminderSentAt: start.getTime() - now.getTime() < settings.reminderHoursBefore * 3_600_000 ? now : null,
        rescheduleCount: appt.rescheduleCount + 1,
        updatedAt: now,
      })
      .where(eq(t.appointments.id, appt.id))
      .returning();
    return { before: appt, appointment: updated };
  });
}

export async function cancelBooking(
  db: DB,
  appointmentId: string,
  p: { actor: "client" | "admin" | "system"; reason?: string; now?: Date },
) {
  const now = p.now ?? new Date();
  const settings = await getSettings(db);
  const appt = await db.query.appointments.findFirst({ where: eq(t.appointments.id, appointmentId) });
  if (!appt) throw new BookingError("not_found", "Appointment not found.");
  if (p.actor === "client") {
    const can = clientCanChange(appt, settings, "cancel", now);
    if (!can.ok) throw new BookingError("policy", can.reason);
  } else if (!["confirmed", "pending"].includes(appt.status)) {
    throw new BookingError("state", "This appointment is not active.");
  }
  const note = p.reason ? `\nCancelled by ${p.actor}: ${p.reason}` : "";
  const [updated] = await db
    .update(t.appointments)
    .set({
      status: "cancelled",
      cancelledAt: now,
      cancelledBy: p.actor,
      holdExpiresAt: null,
      ...(note ? { adminNotes: sql`${t.appointments.adminNotes} || ${note}` } : {}),
      updatedAt: now,
    })
    .where(and(eq(t.appointments.id, appt.id), inArray(t.appointments.status, ["confirmed", "pending"])))
    .returning();
  if (!updated) throw new BookingError("state", "This appointment is not active.");
  return updated;
}

export async function findByToken(db: DB, token: string) {
  if (!token || token.length < 20) return null;
  const appt = await db.query.appointments.findFirst({ where: eq(t.appointments.token, token) });
  if (!appt) return null;
  const client = await db.query.clients.findFirst({ where: eq(t.clients.id, appt.clientId) });
  return client ? { appointment: appt, client } : null;
}

/** Upcoming confirmed appointments due a reminder (and not yet reminded). */
export async function dueForReminder(db: DB, settings: Settings, now = new Date()) {
  const horizon = new Date(now.getTime() + settings.reminderHoursBefore * 3_600_000);
  return db
    .select()
    .from(t.appointments)
    .where(
      and(
        eq(t.appointments.status, "confirmed"),
        isNull(t.appointments.reminderSentAt),
        gt(t.appointments.startsAt, now),
        lt(t.appointments.startsAt, horizon),
      ),
    );
}
