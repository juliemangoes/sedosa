import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { appUrl } from "@/lib/env";
import { stripe, syncCheckoutSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Stripe webhook: confirms bookings when the deposit is paid; releases expired holds. */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return new Response("Stripe not configured", { status: 503 });
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig ?? "", secret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded" ||
    event.type === "checkout.session.expired"
  ) {
    const db = await getDb();
    await syncCheckoutSession(db, event.data.object.id, appUrl(req));
  }
  return new Response("ok");
}
