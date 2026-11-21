import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { findByToken } from "@/lib/booking";
import { appUrl, stripeEnabled } from "@/lib/env";
import { errorResponse } from "@/lib/http";
import { getSettings } from "@/lib/settings";
import { createDepositCheckout, stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Restarts deposit checkout for a booking whose hold is still active (e.g. the client backed out of Stripe). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    if (!stripeEnabled()) return NextResponse.json({ error: "Online payment is not enabled." }, { status: 400 });
    const { token } = await ctx.params;
    const db = await getDb();
    const found = await findByToken(db, token);
    if (!found) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    const a = found.appointment;
    const settings = await getSettings(db);
    const now = Date.now();
    // A hold can be restarted, but never kept alive past twice the normal window.
    const maxHold = a.createdAt.getTime() + 2 * settings.holdMinutes * 60_000;
    if (a.status !== "pending" || !a.holdExpiresAt || a.holdExpiresAt.getTime() < now || now > maxHold) {
      return NextResponse.json({ error: "This booking is no longer held. Please book again." }, { status: 409 });
    }
    if (a.stripeCheckoutSessionId) {
      await stripe().checkout.sessions.expire(a.stripeCheckoutSessionId).catch(() => undefined);
    }
    const checkoutUrl = await createDepositCheckout(db, a, found.client, settings, appUrl(req));
    return NextResponse.json({ checkoutUrl });
  } catch (e) {
    return errorResponse(e);
  }
}
