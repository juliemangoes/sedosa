import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { findByToken } from "@/lib/booking";
import { appUrl } from "@/lib/env";
import { buildIcs } from "@/lib/ics";
import { appointmentEvent } from "@/lib/notify";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const db = await getDb();
  const found = await findByToken(db, token);
  if (!found) return new Response("Not found", { status: 404 });
  const settings = await getSettings(db);
  const ics = buildIcs([appointmentEvent(found.appointment, settings, appUrl(req))]);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sedosa-appointment.ics"',
    },
  });
}
