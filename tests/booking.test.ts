import { describe, it, expect, beforeAll } from "vitest";
import { DateTime } from "luxon";
import { eq } from "drizzle-orm";
import { openDb, runMigrations, setDb, type DB } from "@/db";
import { seedIfEmpty } from "@/db/seed";
import * as t from "@/db/schema";
import { loadCatalog } from "@/lib/catalog";
import {
  BookingError,
  cancelBooking,
  confirmDeposit,
  createBooking,
  expireStaleHolds,
  getAvailability,
  rescheduleBooking,
} from "@/lib/booking";
import { saveSettings } from "@/lib/settings";

const TZ = "America/New_York";
let db: DB;
let browWax: number; // Brow Sculpt/Wax — 30 min, $25, $10 deposit, waiver + waxing form
let thread: number; // Brow Sculpt/Thread — waiver only
let consult: number; // free PMU consultation
let jellyMask: number;
let covington: number;
let decatur: number;

/** A Monday comfortably in the future, at a given local time. */
function nextMondayAt(hhmm: string, weeksAhead = 1) {
  const now = DateTime.now().setZone(TZ);
  const monday = now.plus({ weeks: weeksAhead }).set({ weekday: 1 });
  const [h, m] = hhmm.split(":").map(Number);
  return monday.set({ hour: h, minute: m, second: 0, millisecond: 0 }).toJSDate();
}

async function answersFor(serviceId: number) {
  const cat = await loadCatalog(db);
  const svc = cat.services.find((s) => s.id === serviceId)!;
  const out: Record<string, unknown> = {};
  for (const f of cat.forms.filter((f) => svc.formIds.includes(f.id))) {
    for (const fl of f.fields) {
      out[fl.id] = fl.type === "yesno" ? "no" : fl.type === "checkbox" ? true : fl.type === "checkboxlist" ? [fl.options.at(-1)] : "x";
    }
  }
  return out;
}

const client = (n: number) => ({
  firstName: "Test",
  lastName: `Client${n}`,
  email: `client${n}@example.com`,
  phone: "(404) 555-01" + String(n).padStart(2, "0"),
  smsOptIn: true,
});

beforeAll(async () => {
  const opened = await openDb("memory://");
  db = opened.db;
  await runMigrations(db, opened.kind);
  await seedIfEmpty(db);
  setDb(db);
  const cat = await loadCatalog(db);
  browWax = cat.services.find((s) => s.name === "Brow Sculpt/Wax<3")!.id;
  thread = cat.services.find((s) => s.name === "Brow Sculpt/Thread")!.id;
  consult = cat.services.find((s) => s.name.startsWith("OMBRE POWDER BROWS"))!.id;
  jellyMask = cat.addons.find((a) => a.name === "Jelly Mask")!.id;
  covington = cat.locations.find((l) => l.name === "Sedosa Covington")!.id;
  decatur = cat.locations.find((l) => l.name === "Sedosa Decatur")!.id;
});

describe("seed", () => {
  it("loads the full studio menu", async () => {
    const cat = await loadCatalog(db, { publicOnly: true });
    expect(cat.services).toHaveLength(18);
    expect(cat.categories.map((c) => c.name)).toContain("Waxing!");
    expect(cat.addons).toHaveLength(11);
    expect(cat.forms).toHaveLength(4);
    expect(cat.locations).toHaveLength(2);
    const lami = cat.services.find((s) => s.name === "Brow Lami Set<3")!;
    expect(lami.durationMin).toBe(65);
    expect(lami.priceCents).toBe(9500);
    expect(lami.depositCents).toBe(1000);
    expect(lami.formIds).toHaveLength(3);
  });
});

describe("booking", () => {
  it("rejects missing required intake answers", async () => {
    await expect(
      createBooking(db, {
        serviceId: browWax,
        locationId: "any",
        addonIds: [],
        startsAt: nextMondayAt("10:00").toISOString(),
        client: client(1),
        answers: {},
        bookedBy: "client",
        onlineDeposit: false,
      }),
    ).rejects.toMatchObject({ code: "invalid" });
  });

  it("books, adds add-on time and price, and blocks the slot for others (shared staff)", async () => {
    const start = nextMondayAt("10:00");
    const r = await createBooking(db, {
      serviceId: browWax,
      locationId: covington,
      addonIds: [jellyMask],
      startsAt: start.toISOString(),
      client: client(2),
      answers: await answersFor(browWax),
      bookedBy: "client",
      onlineDeposit: false,
    });
    expect(r.appointment.status).toBe("confirmed");
    expect(r.appointment.depositStatus).toBe("due");
    expect(r.appointment.priceCents).toBe(2500 + 2000);
    expect((r.appointment.endsAt.getTime() - start.getTime()) / 60000).toBe(50);
    expect(r.client.phone).toBe("+14045550102");

    // Same time at the other location is blocked too, because one provider works both.
    await expect(
      createBooking(db, {
        serviceId: thread,
        locationId: decatur,
        addonIds: [],
        startsAt: nextMondayAt("10:30").toISOString(),
        client: client(3),
        answers: await answersFor(thread),
        bookedBy: "client",
        onlineDeposit: false,
      }),
    ).rejects.toMatchObject({ code: "slot_unavailable" });

    const date = DateTime.fromJSDate(start, { zone: TZ }).toISODate()!;
    const avail = await getAvailability(db, { serviceId: thread, locationId: "any", addonIds: [], startDate: date, days: 1 });
    const times = avail.dates[0].slots.map((s) => DateTime.fromISO(s.start).setZone(TZ).toFormat("HH:mm"));
    expect(times).toContain("09:30");
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30");
    expect(times).toContain("11:00");
  });

  it("allows parallel bookings at different locations when staff is not shared", async () => {
    await saveSettings(db, { sharedStaff: false });
    try {
      const at = nextMondayAt("13:00");
      const a = await createBooking(db, {
        serviceId: thread, locationId: covington, addonIds: [], startsAt: at.toISOString(),
        client: client(4), answers: await answersFor(thread), bookedBy: "client", onlineDeposit: false,
      });
      const b = await createBooking(db, {
        serviceId: thread, locationId: "any", addonIds: [], startsAt: at.toISOString(),
        client: client(5), answers: await answersFor(thread), bookedBy: "client", onlineDeposit: false,
      });
      expect(a.appointment.locationId).toBe(covington);
      expect(b.appointment.locationId).toBe(decatur);
    } finally {
      await saveSettings(db, { sharedStaff: true });
    }
  });

  it("never double-books under concurrent requests", async () => {
    const at = nextMondayAt("15:00").toISOString();
    const answers = await answersFor(thread);
    const results = await Promise.allSettled(
      [10, 11, 12, 13, 14].map((n) =>
        createBooking(db, {
          serviceId: thread, locationId: "any", addonIds: [], startsAt: at,
          client: client(n), answers, bookedBy: "client", onlineDeposit: false,
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results.filter((r) => r.status === "rejected")) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(BookingError);
    }
  });

  it("holds the slot while the online deposit is pending, then releases it on expiry", async () => {
    const at = nextMondayAt("17:00");
    const r = await createBooking(db, {
      serviceId: thread, locationId: "any", addonIds: [], startsAt: at.toISOString(),
      client: client(20), answers: await answersFor(thread), bookedBy: "client", onlineDeposit: true,
    });
    expect(r.needsOnlinePayment).toBe(true);
    expect(r.appointment.status).toBe("pending");

    await expect(
      createBooking(db, {
        serviceId: thread, locationId: "any", addonIds: [], startsAt: at.toISOString(),
        client: client(21), answers: await answersFor(thread), bookedBy: "client", onlineDeposit: true,
      }),
    ).rejects.toMatchObject({ code: "slot_unavailable" });

    // 31 minutes later the hold has lapsed and the slot is free again.
    const later = new Date(Date.now() + 31 * 60_000);
    expect(await expireStaleHolds(db, later)).toBeGreaterThanOrEqual(1);
    const again = await createBooking(db, {
      serviceId: thread, locationId: "any", addonIds: [], startsAt: at.toISOString(),
      client: client(21), answers: await answersFor(thread), bookedBy: "client", onlineDeposit: false, now: later,
    });
    expect(again.appointment.status).toBe("confirmed");

    // The first client's late payment still confirms, but is flagged as a clash.
    const paid = await confirmDeposit(db, r.appointment.id, { method: "stripe", stripeId: "pi_test_late" });
    expect(paid.appointment.status).toBe("confirmed");
    expect(paid.conflict).toBe(true);
    // Webhook retry is idempotent.
    const retry = await confirmDeposit(db, r.appointment.id, { method: "stripe", stripeId: "pi_test_late" });
    expect(retry.newlyConfirmed).toBe(false);
    const payments = await db.select().from(t.payments).where(eq(t.payments.appointmentId, r.appointment.id));
    expect(payments).toHaveLength(1);
  });

  it("free consultations need no deposit", async () => {
    const r = await createBooking(db, {
      serviceId: consult, locationId: "any", addonIds: [], startsAt: nextMondayAt("09:30", 2).toISOString(),
      client: client(30), answers: await answersFor(consult), bookedBy: "client", onlineDeposit: true,
    });
    expect(r.needsOnlinePayment).toBe(false);
    expect(r.appointment.depositStatus).toBe("none");
    expect(r.appointment.status).toBe("confirmed");
  });

  it("enforces the reschedule/cancel cutoff for clients but not the owner", async () => {
    const at = nextMondayAt("11:00", 3);
    const r = await createBooking(db, {
      serviceId: thread, locationId: "any", addonIds: [], startsAt: at.toISOString(),
      client: client(40), answers: await answersFor(thread), bookedBy: "client", onlineDeposit: false,
    });
    const newTime = nextMondayAt("12:00", 3);
    const moved = await rescheduleBooking(db, r.appointment.id, { startsAt: newTime.toISOString(), locationId: "any", actor: "client" });
    expect(moved.appointment.startsAt.toISOString()).toBe(newTime.toISOString());
    expect(moved.appointment.rescheduleCount).toBe(1);

    const tooLate = new Date(newTime.getTime() - 3 * 3_600_000);
    await expect(cancelBooking(db, r.appointment.id, { actor: "client", now: tooLate })).rejects.toMatchObject({ code: "policy" });
    const cancelled = await cancelBooking(db, r.appointment.id, { actor: "admin", reason: "client called", now: tooLate });
    expect(cancelled.status).toBe("cancelled");
    await expect(cancelBooking(db, r.appointment.id, { actor: "admin" })).rejects.toMatchObject({ code: "state" });
  });

  it("owner can force a booking outside hours", async () => {
    const sundayNoon = DateTime.now().setZone(TZ).plus({ weeks: 4 }).set({ weekday: 7, hour: 12, minute: 0, second: 0, millisecond: 0 });
    const r = await createBooking(db, {
      serviceId: thread, locationId: covington, addonIds: [], startsAt: sundayNoon.toJSDate().toISOString(),
      client: { ...client(50), phone: "" }, answers: {}, bookedBy: "admin", onlineDeposit: true, force: true,
    });
    expect(r.appointment.status).toBe("confirmed");
    expect(r.appointment.bookedBy).toBe("admin");
  });
});

describe("reminders", () => {
  it("is due inside the reminder window, and skipped for last-minute bookings", async () => {
    const { dueForReminder } = await import("@/lib/booking");
    const { getSettings } = await import("@/lib/settings");
    const settings = await getSettings(db);
    const at = nextMondayAt("18:30", 5);
    const r = await createBooking(db, {
      serviceId: thread, locationId: "any", addonIds: [], startsAt: at.toISOString(),
      client: client(60), answers: await answersFor(thread), bookedBy: "client", onlineDeposit: false,
    });
    expect(r.appointment.reminderSentAt).toBeNull();
    const dayBefore = new Date(at.getTime() - 20 * 3_600_000);
    expect((await dueForReminder(db, settings, dayBefore)).map((a) => a.id)).toContain(r.appointment.id);
    const weekBefore = new Date(at.getTime() - 7 * 86_400_000);
    expect((await dueForReminder(db, settings, weekBefore)).map((a) => a.id)).not.toContain(r.appointment.id);

    // Booked 13 hours ahead: the confirmation doubles as the reminder.
    const soon = new Date(Date.now() + 13 * 3_600_000);
    const late = await createBooking(db, {
      serviceId: thread, locationId: covington, addonIds: [], startsAt: soon.toISOString(),
      client: client(61), answers: {}, bookedBy: "admin", onlineDeposit: false, force: true,
    });
    expect(late.appointment.reminderSentAt).not.toBeNull();
  });
});

describe("ics", () => {
  it("escapes text and folds long lines", async () => {
    const { buildIcs } = await import("@/lib/ics");
    const ics = buildIcs([
      { uid: "x@sedosa", start: new Date("2026-11-23T15:00:00Z"), end: new Date("2026-11-23T15:30:00Z"), summary: "Brow Sculpt/Wax<3, lip; done", description: "a".repeat(200) },
    ]);
    expect(ics).toContain("DTSTART:20261123T150000Z");
    expect(ics).toContain(String.raw`SUMMARY:Brow Sculpt/Wax<3\, lip\; done`);
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
});
