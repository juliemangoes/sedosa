import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import * as t from "@/db/schema";
import { getSettings, type Settings } from "./settings";
import { duration, longDateTime, money, prettyPhone } from "./format";
import { buildIcs, type IcsEvent } from "./ics";
import { sendEmail, sendSms } from "./messaging";
import { stripeEnabled } from "./env";

type Appt = typeof t.appointments.$inferSelect;
type Client = typeof t.clients.$inferSelect;

export function manageUrl(base: string, appt: Appt) {
  return `${base}/booking/${appt.token}`;
}

export function appointmentEvent(appt: Appt, settings: Settings, base: string): IcsEvent {
  const s = appt.snapshot;
  return {
    uid: `${appt.id}@sedosa`,
    start: appt.startsAt,
    end: appt.endsAt,
    summary: `${s.serviceName} – ${settings.businessName}`,
    description: [
      s.serviceName,
      ...s.addons.map((a) => `+ ${a.name}`),
      "",
      `Manage your appointment: ${manageUrl(base, appt)}`,
    ].join("\n"),
    location: [s.locationName, s.locationAddress].filter(Boolean).join(", "),
    url: manageUrl(base, appt),
    status: appt.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
    updated: appt.updatedAt,
  };
}

function balanceLine(appt: Appt) {
  const due = Math.max(appt.priceCents - appt.amountPaidCents, 0);
  if (appt.depositStatus === "paid") return `Deposit of ${money(appt.depositCents)} received. Remaining ${money(due)} is due at your appointment.`;
  if (appt.depositStatus === "due") return `A ${money(appt.depositCents)} non-refundable deposit is required to hold this time.`;
  return due > 0 ? `${money(due)} is due at your appointment.` : "";
}

function detailsText(appt: Appt, settings: Settings) {
  const s = appt.snapshot;
  return [
    `${s.serviceName} (${duration(Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60000))})`,
    ...s.addons.map((a) => `  + ${a.name} (${money(a.priceCents)})`),
    longDateTime(appt.startsAt, settings.timezone),
    `${s.locationName}${s.locationAddress ? ` – ${s.locationAddress}` : ""}`,
    `Total: ${money(appt.priceCents)}`,
  ].join("\n");
}

function htmlWrap(settings: Settings, title: string, inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#ffe1f6;font-family:Georgia,serif;color:#130c11">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
<h1 style="margin:0 0 4px;text-align:center;color:#6d2b67;font-size:22px;font-weight:600">${esc(settings.businessName)}</h1>
<div style="background:#ffdafe;border-radius:6px;padding:22px;margin-top:18px">
<h2 style="margin:0 0 14px;font-size:19px">${esc(title)}</h2>
${inner}
</div>
<p style="text-align:center;font-size:13px;color:#6d2b67;margin-top:18px">${esc(settings.phone)} · ${esc(settings.email)} · @${esc(settings.instagram)}</p>
</div></body></html>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function detailsHtml(appt: Appt, settings: Settings) {
  const s = appt.snapshot;
  const rows = [
    ["Service", `${esc(s.serviceName)}${s.addons.map((a) => `<br>+ ${esc(a.name)}`).join("")}`],
    ["When", esc(longDateTime(appt.startsAt, settings.timezone))],
    ["Where", `${esc(s.locationName)}${s.locationAddress ? `<br>${esc(s.locationAddress)}` : ""}`],
    ["Total", money(appt.priceCents)],
  ];
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px 6px 0;vertical-align:top;color:#6d2b67;white-space:nowrap">${k}</td><td style="padding:6px 0">${v}</td></tr>`,
    )
    .join("")}</table>`;
}

function button(href: string, label: string) {
  return `<p style="margin:20px 0 6px"><a href="${href}" style="background:#000;color:#fff;text-decoration:none;padding:11px 18px;border-radius:3px;font-size:14px;letter-spacing:.06em;text-transform:uppercase">${esc(label)}</a></p>`;
}

function policiesHtml(settings: Settings) {
  return `<div style="margin-top:20px;font-size:13px;line-height:1.5">${settings.policies
    .map((p) => `<p style="margin:0 0 8px"><strong>${esc(p.title)}:</strong> ${esc(p.body)}</p>`)
    .join("")}</div>`;
}

function depositHtml(appt: Appt, settings: Settings) {
  if (appt.depositStatus !== "due" || stripeEnabled()) return "";
  const handles = [
    settings.cashAppHandle && `Cash App: <strong>${esc(settings.cashAppHandle)}</strong>`,
    settings.zelleHandle && `Zelle: <strong>${esc(settings.zelleHandle)}</strong>`,
  ].filter(Boolean);
  return `<div style="margin-top:16px;padding:12px;border:1px solid #6d2b67;border-radius:4px;font-size:14px">${esc(settings.manualDepositInstructions)}${
    handles.length ? `<br><br>${handles.join("<br>")}` : ""
  }</div>`;
}

async function loadClient(db: DB, appt: Appt) {
  return (await db.query.clients.findFirst({ where: eq(t.clients.id, appt.clientId) })) as Client;
}

function smsOk(client: Client) {
  return client.smsOptIn && !!client.phone;
}

// ---------------------------------------------------------------------------

export async function notifyBooked(db: DB, appt: Appt, base: string) {
  const [settings, client] = await Promise.all([getSettings(db), loadClient(db, appt)]);
  const ev = appointmentEvent(appt, settings, base);
  const link = manageUrl(base, appt);
  const subject = `Appointment confirmed: ${appt.snapshot.serviceName} on ${longDateTime(appt.startsAt, settings.timezone)}`;
  const text = [
    `Hi ${client.firstName},`,
    "",
    "Your appointment is booked!",
    "",
    detailsText(appt, settings),
    "",
    balanceLine(appt),
    appt.depositStatus === "due" && !stripeEnabled() ? settings.manualDepositInstructions : "",
    "",
    `Reschedule or cancel: ${link}`,
    "",
    ...settings.policies.map((p) => `${p.title}: ${p.body}`),
    "",
    settings.confirmationNote,
  ].join("\n");
  const html = htmlWrap(
    settings,
    "Your appointment is booked ♡",
    `<p style="margin:0 0 14px">Hi ${esc(client.firstName)},</p>${detailsHtml(appt, settings)}<p style="font-size:14px">${esc(balanceLine(appt))}</p>${depositHtml(appt, settings)}${button(link, "Manage appointment")}${policiesHtml(settings)}<p style="font-size:14px;margin-top:16px">${esc(settings.confirmationNote)}</p>`,
  );
  await sendEmail(db, appt.id, { to: client.email, subject, text, html, attachments: [{ filename: "appointment.ics", content: buildIcs([ev]) }] });
  if (smsOk(client)) {
    await sendSms(
      db,
      appt.id,
      client.phone,
      `${settings.businessName}: You're booked for ${appt.snapshot.serviceName} on ${longDateTime(appt.startsAt, settings.timezone)} at ${appt.snapshot.locationName} (${appt.snapshot.locationAddress}). Manage: ${link} Reply STOP to opt out.`,
    );
  }
  await notifyOwner(db, settings, `New booking: ${client.firstName} ${client.lastName}`, appt, client, base);
}

export async function notifyRescheduled(db: DB, appt: Appt, previousStart: Date, base: string, actor: "client" | "admin") {
  const [settings, client] = await Promise.all([getSettings(db), loadClient(db, appt)]);
  const link = manageUrl(base, appt);
  const was = longDateTime(previousStart, settings.timezone);
  const subject = `Appointment rescheduled: ${longDateTime(appt.startsAt, settings.timezone)}`;
  const text = [`Hi ${client.firstName},`, "", `Your appointment (was ${was}) has been moved to:`, "", detailsText(appt, settings), "", `Manage: ${link}`].join("\n");
  const html = htmlWrap(
    settings,
    "Your appointment was rescheduled",
    `<p style="margin:0 0 14px">Hi ${esc(client.firstName)}, your appointment (was ${esc(was)}) is now:</p>${detailsHtml(appt, settings)}${button(link, "Manage appointment")}`,
  );
  await sendEmail(db, appt.id, { to: client.email, subject, text, html, attachments: [{ filename: "appointment.ics", content: buildIcs([appointmentEvent(appt, settings, base)]) }] });
  if (smsOk(client)) {
    await sendSms(db, appt.id, client.phone, `${settings.businessName}: Your appointment is now ${longDateTime(appt.startsAt, settings.timezone)} at ${appt.snapshot.locationName}. Manage: ${link}`);
  }
  if (actor === "client") await notifyOwner(db, settings, `Rescheduled by client: ${client.firstName} ${client.lastName} (was ${was})`, appt, client, base);
}

export async function notifyCancelled(db: DB, appt: Appt, base: string, actor: "client" | "admin" | "system") {
  const [settings, client] = await Promise.all([getSettings(db), loadClient(db, appt)]);
  const when = longDateTime(appt.startsAt, settings.timezone);
  const subject = `Appointment canceled: ${appt.snapshot.serviceName} on ${when}`;
  const text = [`Hi ${client.firstName},`, "", `Your ${appt.snapshot.serviceName} appointment on ${when} has been canceled.`, "", `Book again anytime: ${base}`].join("\n");
  const html = htmlWrap(
    settings,
    "Your appointment was canceled",
    `<p>Hi ${esc(client.firstName)}, your <strong>${esc(appt.snapshot.serviceName)}</strong> appointment on ${esc(when)} has been canceled.</p>${button(base, "Book again")}`,
  );
  await sendEmail(db, appt.id, { to: client.email, subject, text, html });
  if (smsOk(client)) await sendSms(db, appt.id, client.phone, `${settings.businessName}: Your appointment on ${when} has been canceled. Book again: ${base}`);
  if (actor === "client") await notifyOwner(db, settings, `Canceled by client: ${client.firstName} ${client.lastName}`, appt, client, base);
}

export async function notifyReminder(db: DB, appt: Appt, base: string) {
  const [settings, client] = await Promise.all([getSettings(db), loadClient(db, appt)]);
  const link = manageUrl(base, appt);
  const when = longDateTime(appt.startsAt, settings.timezone);
  const text = [`Hi ${client.firstName},`, "", "Reminder of your upcoming appointment:", "", detailsText(appt, settings), "", balanceLine(appt), "", `Need to change it? ${link}`].join("\n");
  const html = htmlWrap(
    settings,
    "See you soon ♡",
    `<p style="margin:0 0 14px">Hi ${esc(client.firstName)}, this is a reminder of your upcoming appointment.</p>${detailsHtml(appt, settings)}<p style="font-size:14px">${esc(balanceLine(appt))}</p>${button(link, "View appointment")}${policiesHtml(settings)}`,
  );
  await sendEmail(db, appt.id, { to: client.email, subject: `Reminder: ${appt.snapshot.serviceName} ${when}`, text, html });
  if (smsOk(client)) {
    await sendSms(db, appt.id, client.phone, `${settings.businessName} reminder: ${appt.snapshot.serviceName} ${when} at ${appt.snapshot.locationName}, ${appt.snapshot.locationAddress}. Please arrive on time. Manage: ${link}`);
  }
}

async function notifyOwner(db: DB, settings: Settings, subject: string, appt: Appt, client: Client, base: string) {
  const to = process.env.OWNER_EMAIL;
  if (!to) return;
  const text = [
    subject,
    "",
    detailsText(appt, settings),
    "",
    `Client: ${client.firstName} ${client.lastName}`,
    `Phone: ${prettyPhone(client.phone)}`,
    `Email: ${client.email}`,
    `Deposit: ${appt.depositStatus}`,
    "",
    `${base}/admin/appointments/${appt.id}`,
  ].join("\n");
  await sendEmail(db, appt.id, {
    to,
    subject,
    text,
    html: htmlWrap(settings, subject, `${detailsHtml(appt, settings)}<p>${esc(client.firstName)} ${esc(client.lastName)}<br>${esc(prettyPhone(client.phone))}<br>${esc(client.email)}</p>${button(`${base}/admin/appointments/${appt.id}`, "Open in dashboard")}`),
  });
}

/** Passwordless sign-in email: a 6-digit code plus a one-click link. */
export async function sendLoginCode(db: DB, email: string, code: string, link: string) {
  const settings = await getSettings(db);
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  const text = [
    `Your ${settings.businessName} sign-in code is ${code}.`,
    "",
    `Or sign in with one tap: ${link}`,
    "",
    "The code and link expire in 10 minutes. If you didn't ask for this, you can ignore this email.",
  ].join("\n");
  const html = htmlWrap(
    settings,
    "Your sign-in code",
    `<p style="margin:0 0 10px">Enter this code to sign in to your account:</p>
<p style="margin:0 0 18px;font-size:34px;letter-spacing:.18em;font-weight:700;text-align:center;background:#fff;border-radius:12px;padding:14px">${spaced}</p>
<p style="margin:0">Or sign in with one tap:</p>${button(link, "Sign in")}
<p style="font-size:13px;color:#6d2b67;margin-top:16px">The code and link expire in 10 minutes. If you didn't ask for this, you can ignore this email.</p>`,
  );
  return sendEmail(db, null, { to: email, subject: `${spaced} is your ${settings.businessName} sign-in code`, text, html });
}
