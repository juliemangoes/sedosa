import { describe, it, expect, beforeAll } from "vitest";
import sharp from "sharp";
import { DateTime } from "luxon";
import { and, eq } from "drizzle-orm";
import { openDb, runMigrations, setDb, type DB } from "@/db";
import { seedIfEmpty } from "@/db/seed";
import * as t from "@/db/schema";
import { loadCatalog } from "@/lib/catalog";
import { cancelBooking, createBooking, rescheduleBooking } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import {
  applyOptIn,
  dispatchDueReminders,
  dueReminders,
  markSentManually,
  renderTemplate,
  scheduleAutoReminder,
  scheduleManual,
  syncReminders,
  templateContext,
  waLink,
  waNumber,
} from "@/lib/whatsapp";
import { ledger, recurringTemplates, resolvePeriod, summarize, toCsv } from "@/lib/finance";
import { MediaError, processImage } from "@/lib/media";

const TZ = "America/New_York";
let db: DB;
let thread: number;
let covington: number;

function mondayAt(hhmm: string, weeksAhead: number) {
  const monday = DateTime.now().setZone(TZ).plus({ weeks: weeksAhead }).set({ weekday: 1 });
  const [h, m] = hhmm.split(":").map(Number);
  return monday.set({ hour: h, minute: m, second: 0, millisecond: 0 }).toJSDate();
}

async function answersFor(serviceId: number) {
  const cat = await loadCatalog(db);
  const svc = cat.services.find((s) => s.id === serviceId)!;
  const out: Record<string, unknown> = {};
  for (const f of cat.forms.filter((f) => svc.formIds.includes(f.id))) {
    for (const fl of f.fields) out[fl.id] = fl.type === "yesno" ? "no" : fl.type === "checkbox" ? true : fl.type === "checkboxlist" ? [fl.options.at(-1)] : "x";
  }
  return out;
}

async function book(n: number, startsAt: Date, whatsappOptIn: boolean) {
  const r = await createBooking(db, {
    serviceId: thread,
    locationId: covington,
    addonIds: [],
    startsAt: startsAt.toISOString(),
    client: { firstName: `Wa${n}`, lastName: "Tester", email: `wa${n}@example.com`, phone: `(404) 555-02${String(n).padStart(2, "0")}`, smsOptIn: false, whatsappOptIn },
    answers: await answersFor(thread),
    bookedBy: "client",
    onlineDeposit: false,
  });
  const client = (await db.query.clients.findFirst({ where: eq(t.clients.id, r.appointment.clientId) }))!;
  return { appt: r.appointment, client };
}

beforeAll(async () => {
  delete process.env.TWILIO_WHATSAPP_FROM;
  const opened = await openDb("memory://");
  db = opened.db;
  await runMigrations(db, opened.kind);
  await seedIfEmpty(db);
  setDb(db);
  const cat = await loadCatalog(db);
  thread = cat.services.find((s) => s.name === "Brow Sculpt/Thread")!.id;
  covington = cat.locations.find((l) => l.name === "Sedosa Covington")!.id;
});

describe("whatsapp helpers", () => {
  it("normalizes numbers for wa.me", () => {
    expect(waNumber("(404) 555-0123")).toBe("14045550123");
    expect(waNumber("+1 404 555 0123")).toBe("14045550123");
    expect(waNumber("+44 7700 900123")).toBe("447700900123");
    expect(waNumber("555-0123")).toBeNull();
    expect(waNumber("")).toBeNull();
    expect(waLink("(404) 555-0123", "Hi & bye ♡")).toBe("https://wa.me/14045550123?text=Hi%20%26%20bye%20%E2%99%A1");
  });

  it("fills placeholders, keeps unknown ones and tidies empty parentheses", () => {
    expect(renderTemplate("Hi {first}! {service} at {studio} ({address}) {nope}", { first: "Ana", service: "Brows", studio: "Sedosa", address: "" })).toBe("Hi Ana! Brows at Sedosa {nope}");
  });

  it("builds the message context from the appointment", async () => {
    const { appt, client } = await book(1, mondayAt("15:00", 3), false);
    const ctx = templateContext(appt, client, await getSettings(db), "https://book.example");
    expect(ctx.first).toBe("Wa1");
    expect(ctx.service).toBe("Brow Sculpt/Thread");
    expect(ctx.time).toBe("3:00 PM");
    expect(ctx.link).toBe(`https://book.example/booking/${appt.token}`);
  });
});

describe("whatsapp reminders", () => {
  it("queues the automatic reminder only for opted-in clients, once", async () => {
    const settings = await getSettings(db);
    const yes = await book(2, mondayAt("10:00", 2), true);
    const no = await book(3, mondayAt("11:00", 2), false);
    const r = await scheduleAutoReminder(db, yes.appt, yes.client, settings);
    expect(r?.origin).toBe("auto");
    expect(r!.sendAt.getTime()).toBe(yes.appt.startsAt.getTime() - settings.whatsappReminderHours * 3_600_000);
    expect((await scheduleAutoReminder(db, yes.appt, yes.client, settings))!.id).toBe(r!.id);
    expect(await scheduleAutoReminder(db, no.appt, no.client, settings)).toBeNull();
  });

  it("skips the reminder when the booking is already inside the window", async () => {
    const settings = await getSettings(db);
    const soon = DateTime.now().setZone(TZ).plus({ hours: 3 }).toJSDate();
    const fake = { ...(await book(4, mondayAt("12:00", 2), true)) };
    expect(await scheduleAutoReminder(db, { ...fake.appt, startsAt: soon }, fake.client, settings)).toBeNull();
  });

  it("moves automatic reminders on reschedule and cancels them on cancel", async () => {
    const settings = await getSettings(db);
    const { appt, client } = await book(5, mondayAt("13:00", 2), true);
    const r = (await scheduleAutoReminder(db, appt, client, settings))!;
    const moved = mondayAt("16:00", 2);
    await rescheduleBooking(db, appt.id, { startsAt: moved.toISOString(), locationId: covington, actor: "admin", force: true });
    await syncReminders(db, appt.id);
    const after = (await db.query.scheduledMessages.findFirst({ where: eq(t.scheduledMessages.id, r.id) }))!;
    expect(after.sendAt.getTime()).toBe(moved.getTime() - settings.whatsappReminderHours * 3_600_000);
    await cancelBooking(db, appt.id, { actor: "admin" });
    await syncReminders(db, appt.id);
    expect((await db.query.scheduledMessages.findFirst({ where: eq(t.scheduledMessages.id, r.id) }))!.status).toBe("canceled");
  });

  it("surfaces due reminders for a manual send when Twilio isn't connected", async () => {
    const settings = await getSettings(db);
    const { appt } = await book(6, mondayAt("14:00", 2), false);
    const m = await scheduleManual(db, appt.id, new Date(Date.now() + 60 * 60_000), "Hi {first}, see you {date}!");
    const later = new Date(Date.now() + 2 * 60 * 60_000);
    expect((await dueReminders(db)).some((d) => d.m.id === m.id)).toBe(false);
    expect((await dueReminders(db, later)).some((d) => d.m.id === m.id)).toBe(true);
    const res = await dispatchDueReminders(db, settings, "https://book.example", later);
    expect(res.sent).toBe(0);
    expect(res.manual).toBeGreaterThanOrEqual(1);
    const sent = await markSentManually(db, m.id, settings, "https://book.example", later);
    expect(sent?.status).toBe("sent");
    expect(sent?.sentVia).toBe("manual");
    expect(await markSentManually(db, m.id, settings, "https://book.example", later)).toBeNull();
    const log = await db.select().from(t.messageLog).where(and(eq(t.messageLog.appointmentId, appt.id), eq(t.messageLog.channel, "whatsapp")));
    expect(log).toHaveLength(1);
    expect(log[0].body).toMatch(/^Hi Wa6, see you \w+day, /);
  });

  it("sends through Twilio when connected: looks ahead to the next run, never twice, keeps failures for a manual send", async () => {
    const settings = await getSettings(db);
    const env = { ...process.env };
    Object.assign(process.env, { TWILIO_ACCOUNT_SID: "ACtest", TWILIO_AUTH_TOKEN: "tok", TWILIO_WHATSAPP_FROM: "+14045550000" });
    const calls: URLSearchParams[] = [];
    const realFetch = globalThis.fetch;
    let fail = false;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      calls.push(new URLSearchParams(init.body as URLSearchParams));
      return new Response(fail ? "nope" : "{}", { status: fail ? 400 : 201 });
    }) as typeof fetch;
    try {
      const { appt } = await book(9, mondayAt("18:00", 2), true);
      const inSixHours = new Date(Date.now() + 6 * 3_600_000);
      const m = await scheduleManual(db, appt.id, inSixHours, "Hi {first}!");
      // Not due yet, and outside a one-hour lookahead…
      expect((await dispatchDueReminders(db, settings, "https://book.example", new Date(), 60)).sent).toBe(0);
      // …but inside a daily job's window.
      expect((await dispatchDueReminders(db, settings, "https://book.example", new Date(), 24 * 60)).sent).toBe(1);
      expect(calls.at(-1)?.get("To")).toBe("whatsapp:+14045550209");
      expect(calls.at(-1)?.get("Body")).toBe("Hi Wa9!");
      expect((await db.query.scheduledMessages.findFirst({ where: eq(t.scheduledMessages.id, m.id) }))?.sentVia).toBe("twilio");
      expect((await dispatchDueReminders(db, settings, "https://book.example", new Date(), 24 * 60)).sent).toBe(0);

      fail = true;
      const m2 = await scheduleManual(db, appt.id, new Date(Date.now() - 60_000), "Second");
      const r = await dispatchDueReminders(db, settings, "https://book.example");
      expect(r).toMatchObject({ sent: 0, failed: 1 });
      const after = (await db.query.scheduledMessages.findFirst({ where: eq(t.scheduledMessages.id, m2.id) }))!;
      expect(after.status).toBe("failed");
      expect(after.error).toMatch(/^400/);
      expect((await dueReminders(db)).some((d) => d.m.id === m2.id)).toBe(true); // shown on Home for a manual send
    } finally {
      globalThis.fetch = realFetch;
      process.env = env;
    }
  });

  it("follows the client's opt-in changes", async () => {
    const settings = await getSettings(db);
    const { appt, client } = await book(7, mondayAt("17:00", 2), false);
    await db.update(t.clients).set({ whatsappOptIn: true }).where(eq(t.clients.id, client.id));
    await applyOptIn(db, client.id, settings);
    const queued = () => db.select().from(t.scheduledMessages).where(and(eq(t.scheduledMessages.appointmentId, appt.id), eq(t.scheduledMessages.status, "scheduled")));
    expect(await queued()).toHaveLength(1);
    await db.update(t.clients).set({ whatsappOptIn: false }).where(eq(t.clients.id, client.id));
    await applyOptIn(db, client.id, settings);
    expect(await queued()).toHaveLength(0);
  });
});

describe("finance", () => {
  it("combines appointment payments with manual entries", async () => {
    const { appt } = await book(8, mondayAt("10:30", 3), false);
    const today = DateTime.now().setZone(TZ).toISODate()!;
    const month = today.slice(0, 7);
    await db.insert(t.payments).values([
      { appointmentId: appt.id, kind: "deposit", method: "cashapp", amountCents: 1000 },
      { appointmentId: appt.id, kind: "tip", method: "cash", amountCents: 500 },
    ]);
    const [tpl] = await db.insert(t.transactions).values({ kind: "expense", date: today, amountCents: 120_000, category: "Rent & studio", method: "bank", description: "Suite rent", recurringMonthly: true }).returning();
    await db.insert(t.transactions).values([
      { kind: "expense", date: today, amountCents: 120_000, category: "Rent & studio", method: "bank", description: "Suite rent", recurringSourceId: tpl.id },
      { kind: "expense", date: today, amountCents: 4250, category: "Supplies & products", method: "card", description: 'Wax, "hard" beads' },
      { kind: "income", date: today, amountCents: 3000, category: "Product sales", method: "cash", description: "Brow serum" },
    ]);

    const p = resolvePeriod(TZ, "this-month");
    const entries = await ledger(db, TZ, p.from, p.to);
    expect(entries.some((e) => e.txId === tpl.id)).toBe(false); // the template itself isn't money spent
    expect(entries.filter((e) => e.recurring)).toHaveLength(1); // its logged copy is
    const s = summarize(entries);
    expect(s.incomeCents).toBe(1000 + 500 + 3000);
    expect(s.expenseCents).toBe(120_000 + 4250);
    expect(s.netCents).toBe(4500 - 124_250);
    expect(s.visits).toBe(1);
    expect(s.avgPerVisitCents).toBe(1000);
    expect(s.incomeByCategory.find((c) => c.label === "Tips")?.cents).toBe(500);
    expect(s.expenseByCategory[0]).toEqual({ label: "Rent & studio", cents: 120_000 });

    const rec = await recurringTemplates(db, month);
    expect(rec.find((r) => r.id === tpl.id)?.loggedThisMonth).toBe(true);
    const nextMonth = DateTime.fromISO(`${month}-01`).plus({ months: 1 }).toFormat("yyyy-LL");
    expect((await recurringTemplates(db, nextMonth)).find((r) => r.id === tpl.id)?.loggedThisMonth).toBe(false);

    const csv = toCsv(entries);
    expect(csv.split("\r\n")[0]).toBe("Date,Type,Category,Description,Method,Amount,Source");
    expect(csv).toContain('"Wax, ""hard"" beads",Card,-42.50,Manual');
    expect(csv).toContain("Tips,Brow Sculpt/Thread · Wa8 Tester,Cash,5.00,Appointment");
  });

  it("resolves named periods in the studio's time zone", () => {
    const now = new Date("2026-03-15T12:00:00Z");
    expect(resolvePeriod(TZ, "last-month", undefined, undefined, now)).toMatchObject({ from: "2026-02-01", to: "2026-02-28" });
    expect(resolvePeriod(TZ, "last-12", undefined, undefined, now)).toMatchObject({ from: "2025-04-01", to: "2026-03-31" });
    expect(resolvePeriod(TZ, "custom", "2026-01-10", "2026-01-05", now)).toMatchObject({ from: "2026-01-10", to: "2026-03-15" });
  });
});

describe("media", () => {
  // Uploads arrive already sized by the browser; the server checks, measures and cleans them.
  const solid = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 230, g: 120, b: 190 } } });
  const exif = { IFD0: { Make: "PhoneCo", Model: "Camera 12" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "33/1 36/1 0/1" } };
  const has = (b: Uint8Array, text: string) => Buffer.from(b).includes(Buffer.from(text));

  it("reads the size of JPEG, PNG and WebP uploads", async () => {
    expect(await processImage(await solid(1200, 900).jpeg().toBuffer(), "category")).toMatchObject({ width: 1200, height: 900, mime: "image/jpeg" });
    expect(await processImage(await solid(640, 800).png().toBuffer(), "gallery")).toMatchObject({ width: 640, height: 800, mime: "image/png" });
    expect(await processImage(await solid(1600, 1067).webp().toBuffer(), "gallery")).toMatchObject({ width: 1600, height: 1067, mime: "image/webp" });
    expect(await processImage(await solid(500, 300).webp({ lossless: true }).toBuffer(), "receipt")).toMatchObject({ width: 500, height: 300, mime: "image/webp" });
  });

  it("strips camera and location data, and the image still decodes", async () => {
    for (const img of [solid(800, 600).jpeg(), solid(800, 600).png(), solid(800, 600).webp()]) {
      const input = await img.withExifMerge(exif).toBuffer();
      expect(has(input, "PhoneCo")).toBe(true);
      const out = await processImage(input, "gallery");
      expect(has(out.bytes, "PhoneCo")).toBe(false);
      expect((await sharp(out.bytes).metadata()).exif).toBeUndefined();
      expect(await sharp(out.bytes).metadata()).toMatchObject({ width: 800, height: 600 });
    }
  });

  it("rejects files that aren't images, and oversized ones", async () => {
    await expect(processImage(Buffer.from("definitely not a jpeg"), "receipt")).rejects.toBeInstanceOf(MediaError);
    await expect(processImage(await solid(5000, 3000).jpeg().toBuffer(), "gallery")).rejects.toBeInstanceOf(MediaError);
  });
});
