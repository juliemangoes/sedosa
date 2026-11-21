import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import type { DB } from "@/db";
import * as t from "@/db/schema";
import { confirmDeposit, recordPayment, BookingError } from "./booking";
import { longDateTime } from "./format";
import type { Settings } from "./settings";
import { notifyBooked } from "./notify";

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

type Appt = typeof t.appointments.$inferSelect;
type Client = typeof t.clients.$inferSelect;

/**
 * Starts a Stripe Checkout for the deposit. The card is saved to the client's
 * Stripe customer so the studio can charge the no-show fee from the dashboard,
 * as the liability waiver describes.
 */
export async function createDepositCheckout(db: DB, appt: Appt, c: Client, settings: Settings, base: string) {
  // Stripe requires expires_at at least 30 minutes out.
  const expiresAt = new Date(Date.now() + Math.max(settings.holdMinutes, 31) * 60_000);
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    ...(c.stripeCustomerId ? { customer: c.stripeCustomerId } : { customer_email: c.email, customer_creation: "always" as const }),
    client_reference_id: appt.id,
    metadata: { appointmentId: appt.id },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: appt.depositCents,
          product_data: {
            name: `Non-refundable deposit – ${appt.snapshot.serviceName}`,
            description: `${longDateTime(appt.startsAt, settings.timezone)} · ${appt.snapshot.locationName}`,
          },
        },
      },
    ],
    payment_intent_data: {
      setup_future_usage: "off_session",
      metadata: { appointmentId: appt.id, kind: "deposit" },
      description: `Deposit: ${appt.snapshot.serviceName} ${longDateTime(appt.startsAt, settings.timezone)}`,
    },
    expires_at: Math.floor(expiresAt.getTime() / 1000),
    success_url: `${base}/booking/${appt.token}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/booking/${appt.token}?canceled=1`,
  });
  await db
    .update(t.appointments)
    .set({ stripeCheckoutSessionId: session.id, holdExpiresAt: new Date(expiresAt.getTime() + 2 * 60_000) })
    .where(eq(t.appointments.id, appt.id));
  return session.url!;
}

/**
 * Brings an appointment up to date with its Checkout Session. Called from the
 * webhook and when the client lands back on the site, so bookings confirm even
 * if the webhook is slow or not configured yet.
 */
export async function syncCheckoutSession(db: DB, sessionId: string, base: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  const appointmentId = session.metadata?.appointmentId ?? session.client_reference_id;
  if (!appointmentId) return null;

  if (session.status === "expired") {
    await db
      .update(t.appointments)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(
          eq(t.appointments.id, appointmentId),
          eq(t.appointments.status, "pending"),
          // Ignore older sessions replaced by a retry.
          eq(t.appointments.stripeCheckoutSessionId, session.id),
        ),
      );
    return null;
  }
  if (session.payment_status !== "paid") return null;

  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const result = await confirmDeposit(db, appointmentId, {
    method: "stripe",
    amountCents: session.amount_total ?? undefined,
    stripeId: pi?.id ?? session.id,
  });
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const paymentMethodId = pi ? (typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id) : undefined;
  if (customerId) {
    await db
      .update(t.clients)
      .set({ stripeCustomerId: customerId, ...(paymentMethodId ? { stripePaymentMethodId: paymentMethodId } : {}) })
      .where(eq(t.clients.id, result.appointment.clientId));
  }
  if (result.newlyConfirmed) await notifyBooked(db, result.appointment, base);
  return result;
}

/** Charges the saved card off-session (no-show / late-cancel fee). */
export async function chargeSavedCard(
  db: DB,
  appt: Appt,
  kind: "no_show_fee" | "late_fee" | "balance",
  amountCents: number,
) {
  const c = await db.query.clients.findFirst({ where: eq(t.clients.id, appt.clientId) });
  if (!c?.stripeCustomerId || !c.stripePaymentMethodId) {
    throw new BookingError("state", "No card on file for this client.");
  }
  const label = { no_show_fee: "No-show fee", late_fee: "Late cancellation fee", balance: "Balance" }[kind];
  try {
    const pi = await stripe().paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: c.stripeCustomerId,
      payment_method: c.stripePaymentMethodId,
      off_session: true,
      confirm: true,
      description: `${label}: ${appt.snapshot.serviceName}`,
      metadata: { appointmentId: appt.id, kind },
    });
    if (pi.status !== "succeeded") throw new BookingError("state", `Card charge status: ${pi.status}`);
    await recordPayment(db, appt.id, { kind, method: "stripe", amountCents, stripeId: pi.id });
    return pi.id;
  } catch (e) {
    if (e instanceof BookingError) throw e;
    const msg = e instanceof Stripe.errors.StripeError ? e.message : String(e);
    throw new BookingError("state", `Card was declined or needs the client's approval: ${msg}`);
  }
}
