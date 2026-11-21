import type { NextRequest } from "next/server";
import { and, eq, gt, inArray } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { buildIcs } from "@/lib/ics";
import { getSettings } from "@/lib/settings";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Owner's private calendar feed: subscribe to /api/calendar/<key> in Google,
 * Apple or Outlook Calendar to see bookings on your phone. The key is shown
 * (and can be rotated) in dashboard settings.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const db = await getDb();
  const settings = await getSettings(db);
  const expected = settings.calendarFeedKey;
  const given = key.replace(/\.ics$/, "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("Not found", { status: 404 });
  }
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await db
    .select({ a: t.appointments, c: t.clients })
    .from(t.appointments)
    .innerJoin(t.clients, eq(t.clients.id, t.appointments.clientId))
    .where(and(gt(t.appointments.startsAt, since), inArray(t.appointments.status, ["confirmed", "completed", "pending"])));
  const base = appUrl(req);
  const ics = buildIcs(
    rows.map(({ a, c }) => ({
      uid: `${a.id}@sedosa`,
      start: a.startsAt,
      end: a.endsAt,
      summary: `${c.firstName} ${c.lastName} – ${a.snapshot.serviceName}`,
      description: [
        ...a.snapshot.addons.map((x) => `+ ${x.name}`),
        `Phone: ${c.phone}`,
        `Deposit: ${a.depositStatus}`,
        `${base}/admin/appointments/${a.id}`,
      ].join("\n"),
      location: a.snapshot.locationName,
      status: a.status === "pending" ? ("TENTATIVE" as const) : ("CONFIRMED" as const),
      updated: a.updatedAt,
    })),
    `${settings.businessName} bookings`,
  );
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}
