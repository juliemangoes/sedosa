import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  uuid,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** A time range within a day, "HH:mm" 24h, e.g. { start: "09:30", end: "20:00" }. */
export type DayInterval = { start: string; end: string };
/** Keyed by ISO weekday as a string: "1" = Monday … "7" = Sunday. */
export type WeeklyHours = Record<string, DayInterval[]>;

export type FieldType = "yesno" | "checkbox" | "checkboxlist" | "dropdown" | "text" | "textarea";

export type AppointmentStatus =
  | "pending" // waiting for online deposit; slot is held until holdExpiresAt
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled"
  | "expired"; // deposit never paid, hold released

export type DepositStatus = "none" | "due" | "paid" | "waived";

/** Frozen copy of what was booked, so later price/name edits don't rewrite history. */
export type AppointmentSnapshot = {
  serviceName: string;
  categoryName: string;
  servicePriceCents: number;
  serviceDurationMin: number;
  locationName: string;
  locationAddress: string;
  addons: { id: number; name: string; priceCents: number; durationMin: number }[];
};

export type IntakeAnswer = {
  formId: number;
  formName: string;
  fieldId: number;
  label: string;
  type: FieldType;
  value: string | string[] | boolean;
};

// ---------------------------------------------------------------------------

/** Single-row table (id = 1) holding studio settings as validated JSON. */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A bookable calendar. For Sedosa these are the two studio locations. */
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  weeklyHours: jsonb("weekly_hours").$type<WeeklyHours>().notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Replaces the weekly hours for one date at one location. Empty intervals = closed. */
export const dateOverrides = pgTable(
  "date_overrides",
  {
    id: serial("id").primaryKey(),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD in studio time zone
    intervals: jsonb("intervals").$type<DayInterval[]>().notNull(),
    note: text("note").notNull().default(""),
  },
  (t) => [uniqueIndex("date_overrides_loc_date").on(t.locationId, t.date)],
);

/** Blocked time (vacation, lunch, personal). locationId null = all locations. */
export const timeOff = pgTable("time_off", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  reason: text("reason").notNull().default(""),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  durationMin: integer("duration_min").notNull(),
  priceCents: integer("price_cents").notNull(),
  depositCents: integer("deposit_cents").notNull().default(0),
  paddingBeforeMin: integer("padding_before_min").notNull().default(0),
  paddingAfterMin: integer("padding_after_min").notNull().default(0),
  active: boolean("active").notNull().default(true),
  /** Private services are hidden from the public page but still bookable from the dashboard. */
  private: boolean("private").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const serviceLocations = pgTable(
  "service_locations",
  {
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.serviceId, t.locationId] })],
);

export const addons = pgTable("addons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  durationMin: integer("duration_min").notNull(),
  priceCents: integer("price_cents").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const serviceAddons = pgTable(
  "service_addons",
  {
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    addonId: integer("addon_id")
      .notNull()
      .references(() => addons.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.serviceId, t.addonId] })],
);

export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const formFields = pgTable("form_fields", {
  id: serial("id").primaryKey(),
  formId: integer("form_id")
    .notNull()
    .references(() => forms.id, { onDelete: "cascade" }),
  type: text("type").$type<FieldType>().notNull(),
  label: text("label").notNull(),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  required: boolean("required").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const serviceForms = pgTable(
  "service_forms",
  {
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    formId: integer("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.serviceId, t.formId] })],
);

export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    smsOptIn: boolean("sms_opt_in").notNull().default(false),
    notes: text("notes").notNull().default(""),
    stripeCustomerId: text("stripe_customer_id"),
    stripePaymentMethodId: text("stripe_payment_method_id"),
    /** Last time the client signed in to their account (null = never). */
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("clients_email").on(t.email)],
);

/**
 * One-time sign-in codes for client accounts (passwordless email sign-in).
 * Only hashes are stored: a 6-digit code typed by the client, and a token for
 * the one-click link in the same email.
 */
export const clientLoginCodes = pgTable(
  "client_login_codes",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    linkHash: text("link_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("client_login_codes_email").on(t.email), uniqueIndex("client_login_codes_link").on(t.linkHash)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Secret used in the client's manage/reschedule/cancel link. */
    token: text("token").notNull(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    bufferBeforeMin: integer("buffer_before_min").notNull().default(0),
    bufferAfterMin: integer("buffer_after_min").notNull().default(0),
    status: text("status").$type<AppointmentStatus>().notNull(),
    priceCents: integer("price_cents").notNull(),
    depositCents: integer("deposit_cents").notNull().default(0),
    depositStatus: text("deposit_status").$type<DepositStatus>().notNull().default("none"),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    snapshot: jsonb("snapshot").$type<AppointmentSnapshot>().notNull(),
    answers: jsonb("answers").$type<IntakeAnswer[]>().notNull().default([]),
    clientNotes: text("client_notes").notNull().default(""),
    adminNotes: text("admin_notes").notNull().default(""),
    bookedBy: text("booked_by").$type<"client" | "admin">().notNull().default("client"),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: text("cancelled_by").$type<"client" | "admin" | "system">(),
    rescheduleCount: integer("reschedule_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("appointments_token").on(t.token),
    index("appointments_starts_at").on(t.startsAt),
    index("appointments_client").on(t.clientId),
    index("appointments_checkout").on(t.stripeCheckoutSessionId),
  ],
);

/** Money received or charged against an appointment. */
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"deposit" | "balance" | "no_show_fee" | "late_fee" | "tip" | "other">().notNull(),
    method: text("method").$type<"stripe" | "cash" | "cashapp" | "zelle" | "card" | "other">().notNull(),
    amountCents: integer("amount_cents").notNull(),
    stripeId: text("stripe_id"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_appointment").on(t.appointmentId)],
);

/** Every email/SMS the system sends (or would send, when no provider is configured). */
export const messageLog = pgTable(
  "message_log",
  {
    id: serial("id").primaryKey(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    channel: text("channel").$type<"email" | "sms">().notNull(),
    to: text("to").notNull(),
    subject: text("subject").notNull().default(""),
    body: text("body").notNull(),
    status: text("status").$type<"sent" | "logged" | "failed">().notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("message_log_created").on(t.createdAt)],
);
