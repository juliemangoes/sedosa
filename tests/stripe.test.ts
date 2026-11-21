import { describe, it, expect, beforeAll, vi } from "vitest";
import { DateTime } from "luxon";
import { eq } from "drizzle-orm";

const m = vi.hoisted(() => ({
  create: vi.fn(),
  retrieve: vi.fn(),
  expire: vi.fn(),
  piCreate: vi.fn(),
}));

vi.mock("stripe", () => {
  class StripeError extends Error {}
  class Stripe {
    static errors = { StripeError };
    checkout = { sessions: { create: m.create, retrieve: m.retrieve, expire: m.expire } };
    paymentIntents = { create: m.piCreate };
  }
  return { default: Stripe };
});

import { openDb, runMigrations, setDb, type DB } from "@/db";
import { seedIfEmpty } from "@/db/seed";
import * as t from "@/db/schema";
import { loadCatalog } from "@/lib/catalog";
import { createBooking } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import { chargeSavedCard, createDepositCheckout, syncCheckoutSession } from "@/lib/stripe";

let db: DB;
let thread: number;
let waiverFieldId: number;

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  const o = await openDb("memory://");
  db = o.db;
  await runMigrations(db, o.kind);
  await seedIfEmpty(db);
  setDb(db);
  const cat = await loadCatalog(db);
  thread = cat.services.find((s) => s.name === "Brow Sculpt/Thread")!.id;
  waiverFieldId = cat.forms.find((f) => f.name === "Consent & Liability Waiver")!.fields[0].id;
});

async function pendingBooking(hour: number) {
  const start = DateTime.now().setZone("America/New_York").plus({ weeks: 2 }).set({ weekday: 2, hour, minute: 0, second: 0, millisecond: 0 });
  return createBooking(db, {
    serviceId: thread,
    locationId: "any",
    addonIds: [],
    startsAt: start.toJSDate().toISOString(),
    client: { firstName: "Card", lastName: `Client${hour}`, email: `card${hour}@example.com`, phone: "4045550199", smsOptIn: false },
    answers: { [waiverFieldId]: true },
    bookedBy: "client",
    onlineDeposit: true,
  });
}

describe("Stripe deposits", () => {
  it("creates a deposit checkout that saves the card and expires with the hold", async () => {
    const r = await pendingBooking(10);
    m.create.mockResolvedValueOnce({ id: "cs_1", url: "https://checkout.stripe.test/cs_1" });
    const url = await createDepositCheckout(db, r.appointment, r.client, await getSettings(db), "https://book.example");
    expect(url).toBe("https://checkout.stripe.test/cs_1");

    const args = m.create.mock.calls[0][0];
    expect(args.line_items[0].price_data.unit_amount).toBe(1000);
    expect(args.payment_intent_data.setup_future_usage).toBe("off_session");
    expect(args.customer_creation).toBe("always");
    expect(args.metadata.appointmentId).toBe(r.appointment.id);
    expect(args.expires_at * 1000 - Date.now()).toBeGreaterThanOrEqual(30 * 60_000);
    expect(args.success_url).toContain(`/booking/${r.appointment.token}?session_id={CHECKOUT_SESSION_ID}`);

    const appt = await db.query.appointments.findFirst({ where: eq(t.appointments.id, r.appointment.id) });
    expect(appt!.stripeCheckoutSessionId).toBe("cs_1");
    expect(appt!.holdExpiresAt!.getTime()).toBeGreaterThan(args.expires_at * 1000);
  });

  it("confirms the booking and stores the saved card when the session is paid", async () => {
    const appt = (await db.select().from(t.appointments).where(eq(t.appointments.stripeCheckoutSessionId, "cs_1")))[0];
    const paid = {
      id: "cs_1",
      status: "complete",
      payment_status: "paid",
      amount_total: 1000,
      metadata: { appointmentId: appt.id },
      customer: "cus_123",
      payment_intent: { id: "pi_123", payment_method: "pm_123" },
    };
    m.retrieve.mockResolvedValue(paid);
    const res = await syncCheckoutSession(db, "cs_1", "https://book.example");
    expect(res?.newlyConfirmed).toBe(true);

    const after = await db.query.appointments.findFirst({ where: eq(t.appointments.id, appt.id) });
    expect(after!.status).toBe("confirmed");
    expect(after!.depositStatus).toBe("paid");
    expect(after!.amountPaidCents).toBe(1000);
    const client = await db.query.clients.findFirst({ where: eq(t.clients.id, appt.clientId) });
    expect(client!.stripeCustomerId).toBe("cus_123");
    expect(client!.stripePaymentMethodId).toBe("pm_123");

    // Confirmation email was produced (logged, since no email provider is set).
    const msgs = await db.select().from(t.messageLog).where(eq(t.messageLog.appointmentId, appt.id));
    expect(msgs.some((x) => x.subject.startsWith("Appointment confirmed"))).toBe(true);

    // Webhook + redirect both firing doesn't double count.
    const again = await syncCheckoutSession(db, "cs_1", "https://book.example");
    expect(again?.newlyConfirmed).toBe(false);
    const after2 = await db.query.appointments.findFirst({ where: eq(t.appointments.id, appt.id) });
    expect(after2!.amountPaidCents).toBe(1000);
  });

  it("charges the no-show fee to the saved card", async () => {
    const appt = (await db.select().from(t.appointments).where(eq(t.appointments.stripeCheckoutSessionId, "cs_1")))[0];
    m.piCreate.mockResolvedValueOnce({ id: "pi_fee", status: "succeeded" });
    await chargeSavedCard(db, appt, "no_show_fee", 1500);
    const args = m.piCreate.mock.calls[0][0];
    expect(args).toMatchObject({ amount: 1500, customer: "cus_123", payment_method: "pm_123", off_session: true, confirm: true });
    const pays = await db.select().from(t.payments).where(eq(t.payments.appointmentId, appt.id));
    expect(pays.map((p) => p.kind).sort()).toEqual(["deposit", "no_show_fee"]);
  });

  it("an expired session releases the hold, but not if it was replaced by a retry", async () => {
    const r = await pendingBooking(14);
    await db.update(t.appointments).set({ stripeCheckoutSessionId: "cs_new" }).where(eq(t.appointments.id, r.appointment.id));

    m.retrieve.mockResolvedValueOnce({ id: "cs_old", status: "expired", payment_status: "unpaid", metadata: { appointmentId: r.appointment.id } });
    await syncCheckoutSession(db, "cs_old", "https://book.example");
    let a = await db.query.appointments.findFirst({ where: eq(t.appointments.id, r.appointment.id) });
    expect(a!.status).toBe("pending");

    m.retrieve.mockResolvedValueOnce({ id: "cs_new", status: "expired", payment_status: "unpaid", metadata: { appointmentId: r.appointment.id } });
    await syncCheckoutSession(db, "cs_new", "https://book.example");
    a = await db.query.appointments.findFirst({ where: eq(t.appointments.id, r.appointment.id) });
    expect(a!.status).toBe("expired");
  });
});
