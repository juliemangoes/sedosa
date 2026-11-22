import { z } from "zod";
import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import { settings as settingsTable } from "@/db/schema";

export const settingsSchema = z.object({
  businessName: z.string().min(1).default("Sedosa Beauty Studio"),
  phone: z.string().default("914-770-9090"),
  email: z.string().default("sedosabeautystudio@gmail.com"),
  instagram: z.string().default("sedosabeautystudio"),
  facebook: z.string().default("sedosabeautystudio"),
  timezone: z.string().default("America/New_York"),

  /** Start times are offered every N minutes. */
  slotIntervalMin: z.coerce.number().int().min(5).max(240).default(30),
  /** Earliest a client can book, relative to now. Policy: book at least 12–24h ahead. */
  minNoticeMinutes: z.coerce.number().int().min(0).default(12 * 60),
  /** How far ahead the calendar opens. */
  maxDaysAhead: z.coerce.number().int().min(1).max(365).default(60),
  /** Clients can reschedule/cancel online until this many hours before. */
  rescheduleCutoffHours: z.coerce.number().int().min(0).default(24),
  cancelCutoffHours: z.coerce.number().int().min(0).default(24),
  /** How long an unpaid online booking holds its slot while the client pays. Stripe's minimum is 30. */
  holdMinutes: z.coerce.number().int().min(30).max(1440).default(30),
  /**
   * One provider works both locations: a booking at either location blocks that
   * time everywhere. Turn off if each location has its own staff.
   */
  sharedStaff: z.boolean().default(true),

  noShowFeeCents: z.coerce.number().int().min(0).default(1500),
  lateCancelFeeCents: z.coerce.number().int().min(0).default(1000),
  reminderHoursBefore: z.coerce.number().int().min(1).max(168).default(24),

  cashAppHandle: z.string().default(""),
  zelleHandle: z.string().default(""),
  /** Shown when deposits are collected manually (no Stripe). */
  manualDepositInstructions: z
    .string()
    .default(
      "Your $10 non-refundable deposit is due within 24 hours of booking or your appointment will be canceled. You can pay by Cash App or Zelle; the remainder is due on the day of your appointment (cash, Cash App or Zelle).",
    ),
  policies: z
    .array(z.object({ title: z.string(), body: z.string() }))
    .default([
      {
        title: "Appointments",
        body: "Booking at least 12–24 hours before prevents rush and extra costs. Rescheduling 24 hours before avoids fees.",
      },
      {
        title: "Deposit",
        body: "A non-refundable $10 deposit secures your booking; the remainder is due on appointment day.",
      },
      {
        title: "Late arrivals",
        body: "Timely arrival is crucial; a 15-minute delay cancels the booking, and no-call no-shows incur an additional $15 charge (excluding the deposit).",
      },
      {
        title: "Cancellations",
        body: "Please provide at least 24–48 hours' notice. Late cancellations incur an additional $10 charge (excluding the deposit).",
      },
    ]),
  locationNote: z.string().default("Exact address is sent once your appointment is booked."),
  confirmationNote: z
    .string()
    .default("Thank you for booking with me babe! Make sure to tag us in your selfies ♡"),
  bannerImages: z
    .array(z.string())
    .default([
      "/banner/banner-1.jpg",
      "/banner/banner-2.jpg",
      "/banner/banner-3.jpg",
      "/banner/banner-4.png",
      "/banner/banner-5.png",
      "/banner/banner-6.jpg",
    ]),
  /** The studio's WhatsApp number (shown to clients as a "WhatsApp me" link). */
  whatsappNumber: z.string().default(""),
  /** Automatically schedule a WhatsApp reminder for clients who opt in. */
  whatsappReminders: z.boolean().default(true),
  whatsappReminderHours: z.coerce.number().int().min(1).max(168).default(24),
  /** Placeholders: {first} {service} {date} {time} {studio} {address} {link} {deposit} {business} */
  whatsappReminderTemplate: z
    .string()
    .default(
      "Hi {first}! ♡ Just a reminder of your {service} appointment on {date} at {time} at {studio} ({address}). Please arrive on time and come with a clean face. Need to change it? {link}",
    ),
  /** Ready-made messages for the WhatsApp button on an appointment. */
  whatsappTemplates: z
    .array(z.object({ label: z.string(), body: z.string() }))
    .default([
      { label: "Confirmation", body: "Hi {first}! ♡ You're booked for {service} on {date} at {time} at {studio}. Can't wait to see you! Details: {link}" },
      { label: "Reminder", body: "Hi {first}! Just a reminder of your {service} appointment on {date} at {time} at {studio} ({address}). See you soon ♡" },
      { label: "Deposit request", body: "Hi {first}! To hold your {service} appointment on {date} at {time}, please send the {deposit} deposit within 24 hours (Cash App or Zelle). Thank you ♡" },
      { label: "Running late", body: "Hi {first}, I'm running a few minutes behind today. Thank you so much for your patience ♡" },
      { label: "Aftercare", body: "Hi {first}! Thank you for coming in ♡ Keep the area dry for 24 hours and avoid makeup and heat on it. Message me with any questions!" },
      { label: "Thank you", body: "Thank you for visiting {business}, {first}! I'd love to see your selfies, tag us on Instagram ♡ Book your next visit: {link}" },
    ]),
  /** Secret part of the owner's calendar subscription URL (rotate to revoke). */
  calendarFeedKey: z.string().default(""),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

export async function getSettings(db: DB): Promise<Settings> {
  const row = await db.query.settings.findFirst({ where: eq(settingsTable.id, 1) });
  return settingsSchema.parse(row?.data ?? {});
}

export async function saveSettings(db: DB, patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings(db);
  const next = settingsSchema.parse({ ...current, ...patch });
  await db
    .insert(settingsTable)
    .values({ id: 1, data: next })
    .onConflictDoUpdate({ target: settingsTable.id, set: { data: next, updatedAt: new Date() } });
  return next;
}
