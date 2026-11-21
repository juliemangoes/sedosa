import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { findByToken, rescheduleBooking } from "@/lib/booking";
import { appUrl } from "@/lib/env";
import { errorResponse } from "@/lib/http";
import { notifyRescheduled } from "@/lib/notify";

export const dynamic = "force-dynamic";

const body = z.object({
  startsAt: z.string().max(40),
  locationId: z.union([z.literal("any"), z.number().int()]).default("any"),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const parsed = body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const db = await getDb();
    const found = await findByToken(db, token);
    if (!found) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    const { before, appointment } = await rescheduleBooking(db, found.appointment.id, { ...parsed.data, actor: "client" });
    await notifyRescheduled(db, appointment, before.startsAt, appUrl(req), "client");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
