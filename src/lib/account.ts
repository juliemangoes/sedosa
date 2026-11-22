import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, gte, isNull, sql } from "drizzle-orm";
import type { DB } from "@/db";
import * as t from "@/db/schema";
import type { IntakeAnswer } from "@/db/schema";
import { sessionSecret } from "./session-secret";

/**
 * Client accounts use passwordless email sign-in: a 6-digit code (typed in)
 * plus a one-click link in the same email. Only keyed hashes are stored.
 */

export const CODE_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const MAX_CODES_PER_HOUR = 5;

export class AccountError extends Error {
  constructor(
    public code: "invalid_email" | "rate_limited" | "invalid_code" | "expired" | "too_many_attempts" | "invalid_link",
    message: string,
  ) {
    super(message);
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function key() {
  const k = sessionSecret();
  if (!k) throw new Error("SESSION_SECRET must be set to use client accounts.");
  return Buffer.from(k);
}

function hash(kind: "code" | "link", value: string, email = "") {
  return createHmac("sha256", key()).update(`${kind}:${email}:${value}`).digest("hex");
}

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Issues a new code + link token for an email. Earlier unused codes stop working. */
export async function requestLoginCode(db: DB, rawEmail: string, now = new Date()) {
  const email = normalizeEmail(rawEmail);
  if (!EMAIL.test(email) || email.length > 200) throw new AccountError("invalid_email", "Please enter a valid email address.");

  const hourAgo = new Date(now.getTime() - 3_600_000);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.clientLoginCodes)
    .where(and(eq(t.clientLoginCodes.email, email), gte(t.clientLoginCodes.createdAt, hourAgo)));
  if (n >= MAX_CODES_PER_HOUR) throw new AccountError("rate_limited", "Too many codes requested. Please wait a little and try again.");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const linkToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60_000);

  await db
    .update(t.clientLoginCodes)
    .set({ consumedAt: now })
    .where(and(eq(t.clientLoginCodes.email, email), isNull(t.clientLoginCodes.consumedAt)));
  await db.insert(t.clientLoginCodes).values({
    email,
    codeHash: hash("code", code, email),
    linkHash: hash("link", linkToken),
    expiresAt,
    createdAt: now,
  });
  return { email, code, linkToken, expiresAt };
}

async function signIn(db: DB, email: string, now: Date) {
  const [client] = await db
    .insert(t.clients)
    .values({ email, firstName: "", lastName: "", lastLoginAt: now })
    .onConflictDoUpdate({ target: t.clients.email, set: { lastLoginAt: now } })
    .returning();
  return client;
}

/** Checks a typed code. Wrong guesses count against the code; it locks after MAX_ATTEMPTS. */
export async function verifyLoginCode(db: DB, rawEmail: string, rawCode: string, now = new Date()) {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  const [row] = await db
    .select()
    .from(t.clientLoginCodes)
    .where(and(eq(t.clientLoginCodes.email, email), isNull(t.clientLoginCodes.consumedAt)))
    .orderBy(desc(t.clientLoginCodes.createdAt))
    .limit(1);
  if (!row) throw new AccountError("invalid_code", "That code isn't valid. Please request a new one.");
  if (row.expiresAt <= now) throw new AccountError("expired", "That code has expired. Please request a new one.");
  if (row.attempts >= MAX_ATTEMPTS) throw new AccountError("too_many_attempts", "Too many tries. Please request a new code.");

  if (code.length !== 6 || !sameHash(row.codeHash, hash("code", code, email))) {
    const [after] = await db
      .update(t.clientLoginCodes)
      .set({ attempts: sql`${t.clientLoginCodes.attempts} + 1` })
      .where(eq(t.clientLoginCodes.id, row.id))
      .returning({ attempts: t.clientLoginCodes.attempts });
    if (after.attempts >= MAX_ATTEMPTS) throw new AccountError("too_many_attempts", "Too many tries. Please request a new code.");
    throw new AccountError("invalid_code", "That code doesn't match. Check the email and try again.");
  }

  const consumed = await db
    .update(t.clientLoginCodes)
    .set({ consumedAt: now })
    .where(and(eq(t.clientLoginCodes.id, row.id), isNull(t.clientLoginCodes.consumedAt)))
    .returning({ id: t.clientLoginCodes.id });
  if (!consumed.length) throw new AccountError("invalid_code", "That code was already used. Please request a new one.");
  return signIn(db, email, now);
}

/** Signs in from the one-click link in the email. */
export async function verifyLoginLink(db: DB, token: string, now = new Date()) {
  if (!token || token.length < 20 || token.length > 100) throw new AccountError("invalid_link", "That sign-in link isn't valid.");
  const consumed = await db
    .update(t.clientLoginCodes)
    .set({ consumedAt: now })
    .where(and(eq(t.clientLoginCodes.linkHash, hash("link", token)), isNull(t.clientLoginCodes.consumedAt), gt(t.clientLoginCodes.expiresAt, now)))
    .returning({ email: t.clientLoginCodes.email });
  if (!consumed.length) throw new AccountError("invalid_link", "That sign-in link has expired or was already used.");
  return signIn(db, consumed[0].email, now);
}

export type AccountProfile = { firstName: string; lastName: string; email: string; phone: string; smsOptIn: boolean };

export function profileOf(c: typeof t.clients.$inferSelect): AccountProfile {
  return { firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, smsOptIn: c.smsOptIn };
}

/**
 * Most recent answer to each intake question across the client's bookings,
 * used to pre-fill forms. Consent checkboxes are never carried over: those
 * must be ticked again each time.
 */
export async function savedAnswers(db: DB, clientId: number): Promise<Record<string, IntakeAnswer["value"]>> {
  const rows = await db
    .select({ answers: t.appointments.answers })
    .from(t.appointments)
    .where(eq(t.appointments.clientId, clientId))
    .orderBy(desc(t.appointments.createdAt))
    .limit(20);
  const out: Record<string, IntakeAnswer["value"]> = {};
  for (const r of rows) {
    for (const a of r.answers) {
      if (a.type === "checkbox") continue;
      const k = String(a.fieldId);
      if (!(k in out)) out[k] = a.value;
    }
  }
  return out;
}
