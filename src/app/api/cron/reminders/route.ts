import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { dueForReminder, expireStaleHolds } from "@/lib/booking";
import { appUrl } from "@/lib/env";
import { notifyReminder } from "@/lib/notify";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Run hourly (vercel.json). Releases unpaid holds and sends reminders.
 * Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const db = await getDb();
  const settings = await getSettings(db);
  const expired = await expireStaleHolds(db);
  const due = await dueForReminder(db, settings);
  let sent = 0;
  for (const appt of due) {
    // Claim first so overlapping runs never double-send.
    const claimed = await db
      .update(t.appointments)
      .set({ reminderSentAt: new Date() })
      .where(and(eq(t.appointments.id, appt.id), isNull(t.appointments.reminderSentAt)))
      .returning();
    if (!claimed.length) continue;
    await notifyReminder(db, claimed[0], appUrl(req));
    sent++;
  }
  return NextResponse.json({ expired, reminders: sent });
}
