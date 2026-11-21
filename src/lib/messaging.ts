import type { DB } from "@/db";
import { messageLog } from "@/db/schema";

export type Email = { to: string; subject: string; html: string; text: string; attachments?: { filename: string; content: string }[] };

/**
 * Sends an email through Resend when RESEND_API_KEY is set; otherwise the
 * message is only recorded in the dashboard's message log.
 */
export async function sendEmail(db: DB, appointmentId: string | null, email: Email) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  let status: "sent" | "logged" | "failed" = "logged";
  let error: string | null = null;
  if (key && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
          attachments: email.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64") })),
        }),
      });
      if (res.ok) status = "sent";
      else {
        status = "failed";
        error = `${res.status} ${(await res.text()).slice(0, 500)}`;
      }
    } catch (e) {
      status = "failed";
      error = String(e).slice(0, 500);
    }
  }
  await db.insert(messageLog).values({ appointmentId, channel: "email", to: email.to, subject: email.subject, body: email.text, status, error });
  if (status === "failed") console.error("Email failed", email.to, error);
  return status;
}

/** Sends an SMS through Twilio when configured; otherwise logs it. */
export async function sendSms(db: DB, appointmentId: string | null, to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  let status: "sent" | "logged" | "failed" = "logged";
  let error: string | null = null;
  if (sid && token && from && to) {
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      });
      if (res.ok) status = "sent";
      else {
        status = "failed";
        error = `${res.status} ${(await res.text()).slice(0, 500)}`;
      }
    } catch (e) {
      status = "failed";
      error = String(e).slice(0, 500);
    }
  }
  await db.insert(messageLog).values({ appointmentId, channel: "sms", to, body, status, error });
  if (status === "failed") console.error("SMS failed", to, error);
  return status;
}
