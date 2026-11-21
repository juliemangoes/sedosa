import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { cancelBooking, findByToken } from "@/lib/booking";
import { appUrl } from "@/lib/env";
import { errorResponse } from "@/lib/http";
import { notifyCancelled } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const db = await getDb();
    const found = await findByToken(db, token);
    if (!found) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    const appt = await cancelBooking(db, found.appointment.id, { actor: "client" });
    await notifyCancelled(db, appt, appUrl(req), "client");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
