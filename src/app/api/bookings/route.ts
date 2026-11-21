import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { createBooking } from "@/lib/booking";
import { appUrl, stripeEnabled } from "@/lib/env";
import { errorResponse } from "@/lib/http";
import { notifyBooked } from "@/lib/notify";
import { createDepositCheckout } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const body = z.object({
  serviceId: z.number().int(),
  locationId: z.union([z.literal("any"), z.number().int()]),
  addonIds: z.array(z.number().int()).max(20).default([]),
  startsAt: z.string().max(40),
  client: z.object({
    firstName: z.string().max(80),
    lastName: z.string().max(80),
    email: z.string().max(200),
    phone: z.string().max(40),
    smsOptIn: z.boolean().default(false),
  }),
  answers: z.record(z.string(), z.unknown()).default({}),
  clientNotes: z.string().max(2000).optional(),
});

/** POST /api/bookings — create an appointment from the public booking page. */
export async function POST(req: NextRequest) {
  try {
    const parsed = body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid booking request." }, { status: 400 });
    const db = await getDb();
    const base = appUrl(req);
    const online = stripeEnabled();

    const { appointment, client, needsOnlinePayment, settings } = await createBooking(db, {
      ...parsed.data,
      bookedBy: "client",
      onlineDeposit: online,
    });

    if (needsOnlinePayment) {
      try {
        const checkoutUrl = await createDepositCheckout(db, appointment, client, settings, base);
        return NextResponse.json({ token: appointment.token, checkoutUrl });
      } catch (e) {
        // Release the slot if Stripe is unreachable or misconfigured.
        await db.update(t.appointments).set({ status: "expired" }).where(eq(t.appointments.id, appointment.id));
        console.error("Stripe checkout failed", e);
        return NextResponse.json({ error: "We couldn't start the deposit payment. Please try again in a moment." }, { status: 502 });
      }
    }

    await notifyBooked(db, appointment, base);
    return NextResponse.json({ token: appointment.token });
  } catch (e) {
    return errorResponse(e);
  }
}
