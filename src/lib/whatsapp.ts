import { DateTime } from "luxon";
import { and, asc, eq, gt, inArray, lte } from "drizzle-orm";
import type { DB } from "@/db";
import * as t from "@/db/schema";
import type { Settings } from "./settings";
import { money } from "./format";
import { prettyName } from "./display";

/**
 * WhatsApp for the studio:
 *  - click-to-chat links (wa.me) with ready-written messages, no setup needed;
 *  - scheduled reminders, sent through Twilio's WhatsApp API when it's
 *    connected, otherwise surfaced on the dashboard as one-tap "send" items.
 */

type Appt = typeof t.appointments.$inferSelect;
type Client = typeof t.clients.$inferSelect;

/** E.164 digits without "+", as wa.me wants. US 10-digit numbers get the 1. */
export function waNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.length === 10) d = `1${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

export function waLink(phone: string | null | undefined, text = ""): string | null {
  const n = waNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const PLACEHOLDERS = ["first", "service", "date", "time", "studio", "address", "link", "deposit", "business"] as const;

export function templateContext(appt: Appt | null, client: Pick<Client, "firstName">, settings: Settings, base: string): Record<string, string> {
  const start = appt ? DateTime.fromJSDate(appt.startsAt).setZone(settings.timezone) : null;
  return {
    first: client.firstName || "there",
    service: appt ? prettyName(appt.snapshot.serviceName) : "your appointment",
    date: start ? start.toFormat("cccc, LLLL d") : "",
    time: start ? start.toFormat("h:mm a") : "",
    studio: appt?.snapshot.locationName ?? settings.businessName,
    address: appt?.snapshot.locationAddress ?? "",
    link: appt ? `${base}/booking/${appt.token}` : base,
    deposit: appt && appt.depositCents ? money(appt.depositCents) : "deposit",
    business: settings.businessName,
  };
}

export function renderTemplate(template: string, ctx: Record<string, string>): string {
  return template
    .replace(/\{(\w+)\}/g, (m, k: string) => (k in ctx ? ctx[k] : m))
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function whatsappApiConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

// ---------------------------------------------------------------------------
// Scheduling

const ACTIVE: Appt["status"][] = ["confirmed", "pending"];

/** Schedules the standard reminder for a confirmed booking whose client opted in. Idempotent. */
export async function scheduleAutoReminder(db: DB, appt: Appt, client: Client, settings: Settings, now = new Date()) {
  if (!settings.whatsappReminders || !client.whatsappOptIn || !waNumber(client.phone)) return null;
  if (appt.status !== "confirmed") return null;
  const offsetMinutes = settings.whatsappReminderHours * 60;
  const sendAt = new Date(appt.startsAt.getTime() - offsetMinutes * 60_000);
  if (sendAt <= now) return null; // booked inside the window: the confirmation covers it
  const existing = await db.query.scheduledMessages.findFirst({
    where: and(eq(t.scheduledMessages.appointmentId, appt.id), eq(t.scheduledMessages.origin, "auto"), eq(t.scheduledMessages.status, "scheduled")),
  });
  if (existing) return existing;
  const [row] = await db
    .insert(t.scheduledMessages)
    .values({ appointmentId: appt.id, channel: "whatsapp", origin: "auto", offsetMinutes, sendAt, template: settings.whatsappReminderTemplate })
    .returning();
  return row;
}

/** Keeps queued reminders in step with the appointment: moves them on reschedule, cancels them when it's off. */
export async function syncReminders(db: DB, appointmentId: string, now = new Date()) {
  const appt = await db.query.appointments.findFirst({ where: eq(t.appointments.id, appointmentId) });
  if (!appt) return;
  const queued = await db
    .select()
    .from(t.scheduledMessages)
    .where(and(eq(t.scheduledMessages.appointmentId, appointmentId), inArray(t.scheduledMessages.status, ["scheduled", "failed"])));
  for (const m of queued) {
    if (!ACTIVE.includes(appt.status) || appt.startsAt <= now) {
      await db.update(t.scheduledMessages).set({ status: "canceled" }).where(eq(t.scheduledMessages.id, m.id));
      continue;
    }
    if (m.origin === "auto" && m.offsetMinutes != null) {
      const sendAt = new Date(appt.startsAt.getTime() - m.offsetMinutes * 60_000);
      await db
        .update(t.scheduledMessages)
        .set(sendAt <= now ? { status: "canceled" } : { sendAt, status: "scheduled", error: null })
        .where(eq(t.scheduledMessages.id, m.id));
    }
  }
}

export async function scheduleManual(db: DB, appointmentId: string, sendAt: Date, template: string) {
  const [row] = await db.insert(t.scheduledMessages).values({ appointmentId, channel: "whatsapp", origin: "owner", sendAt, template }).returning();
  return row;
}

/**
 * Reminders whose time has come (still scheduled, or failed to send) for upcoming
 * active appointments. `until` lets a job send ones that fall due before its next run.
 */
export async function dueReminders(db: DB, now = new Date(), until = now) {
  return db
    .select({ m: t.scheduledMessages, a: t.appointments, c: t.clients })
    .from(t.scheduledMessages)
    .innerJoin(t.appointments, eq(t.appointments.id, t.scheduledMessages.appointmentId))
    .innerJoin(t.clients, eq(t.clients.id, t.appointments.clientId))
    .where(
      and(
        inArray(t.scheduledMessages.status, ["scheduled", "failed"]),
        lte(t.scheduledMessages.sendAt, until),
        inArray(t.appointments.status, ACTIVE),
        gt(t.appointments.startsAt, now),
      ),
    )
    .orderBy(asc(t.scheduledMessages.sendAt));
}

async function sendTwilio(to: string, body: string, ctx: Record<string, string>) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM!.replace(/^whatsapp:/, "");
  const params = new URLSearchParams({ To: `whatsapp:+${to}`, From: `whatsapp:${from.startsWith("+") ? from : `+${from}`}` });
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
  if (contentSid) {
    // Approved template: {{1}} first name, {{2}} service, {{3}} date, {{4}} time, {{5}} studio, {{6}} link
    params.set("ContentSid", contentSid);
    params.set("ContentVariables", JSON.stringify({ 1: ctx.first, 2: ctx.service, 3: ctx.date, 4: ctx.time, 5: ctx.studio, 6: ctx.link }));
  } else {
    params.set("Body", body);
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
}

/**
 * Sends due reminders through Twilio when connected. Without it, nothing is sent
 * and the reminders wait on the dashboard for a one-tap manual send.
 * `lookaheadMinutes`: also send ones due before the next scheduled run (the cron
 * job passes its interval), so a daily job sends a little early instead of late.
 */
export async function dispatchDueReminders(db: DB, settings: Settings, base: string, now = new Date(), lookaheadMinutes = 0) {
  const until = new Date(now.getTime() + Math.max(0, lookaheadMinutes) * 60_000);
  if (!whatsappApiConfigured()) return { sent: 0, failed: 0, manual: (await dueReminders(db, now)).length };
  let sent = 0;
  let failed = 0;
  for (const { m, a, c } of await dueReminders(db, now, until)) {
    if (m.status === "failed") continue; // leave failures for the owner to send by hand
    // Claim it so overlapping runs never double-send.
    const claimed = await db
      .update(t.scheduledMessages)
      .set({ status: "sent", sentVia: "twilio", sentAt: now })
      .where(and(eq(t.scheduledMessages.id, m.id), eq(t.scheduledMessages.status, "scheduled")))
      .returning({ id: t.scheduledMessages.id });
    if (!claimed.length) continue;
    const to = waNumber(c.phone);
    const ctx = templateContext(a, c, settings, base);
    const body = renderTemplate(m.template, ctx);
    try {
      if (!to) throw new Error("Client has no valid mobile number.");
      await sendTwilio(to, body, ctx);
      await db.insert(t.messageLog).values({ appointmentId: a.id, channel: "whatsapp", to: `+${to}`, body, status: "sent" });
      sent++;
    } catch (e) {
      const error = String(e instanceof Error ? e.message : e).slice(0, 500);
      await db.update(t.scheduledMessages).set({ status: "failed", sentVia: null, sentAt: null, error }).where(eq(t.scheduledMessages.id, m.id));
      await db.insert(t.messageLog).values({ appointmentId: a.id, channel: "whatsapp", to: c.phone, body, status: "failed", error });
      failed++;
    }
  }
  return { sent, failed, manual: 0 };
}

/** The owner sent it from their own WhatsApp. */
export async function markSentManually(db: DB, id: number, settings: Settings, base: string, now = new Date()) {
  const [row] = await db
    .update(t.scheduledMessages)
    .set({ status: "sent", sentVia: "manual", sentAt: now, error: null })
    .where(and(eq(t.scheduledMessages.id, id), inArray(t.scheduledMessages.status, ["scheduled", "failed"])))
    .returning();
  if (!row) return null;
  const a = await db.query.appointments.findFirst({ where: eq(t.appointments.id, row.appointmentId) });
  const c = a ? await db.query.clients.findFirst({ where: eq(t.clients.id, a.clientId) }) : null;
  if (a && c) {
    await db.insert(t.messageLog).values({ appointmentId: a.id, channel: "whatsapp", to: c.phone, body: renderTemplate(row.template, templateContext(a, c, settings, base)), status: "sent" });
  }
  return row;
}

/** Client changed their WhatsApp opt-in: queue the standard reminder for upcoming visits, or drop the automatic ones. */
export async function applyOptIn(db: DB, clientId: number, settings: Settings, now = new Date()) {
  const client = await db.query.clients.findFirst({ where: eq(t.clients.id, clientId) });
  if (!client) return;
  const upcoming = await db
    .select()
    .from(t.appointments)
    .where(and(eq(t.appointments.clientId, clientId), eq(t.appointments.status, "confirmed"), gt(t.appointments.startsAt, now)));
  if (!upcoming.length) return;
  if (client.whatsappOptIn) {
    for (const a of upcoming) await scheduleAutoReminder(db, a, client, settings, now);
  } else {
    await db
      .update(t.scheduledMessages)
      .set({ status: "canceled" })
      .where(and(inArray(t.scheduledMessages.appointmentId, upcoming.map((a) => a.id)), eq(t.scheduledMessages.origin, "auto"), eq(t.scheduledMessages.status, "scheduled")));
  }
}
