import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import * as t from "@/db/schema";
import { sessionSecret } from "./session-secret";
import { onWorkers } from "./runtime";

/** Client account session: a signed cookie, separate from the owner's dashboard login. */
export const CLIENT_COOKIE = "sedosa_client";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days
const AUDIENCE = "sedosa-client";

function secret() {
  const s = sessionSecret();
  if (!s) throw new Error("SESSION_SECRET must be set to use client accounts.");
  return s;
}

export async function signClientToken(clientId: number) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(clientId))
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifyClientToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], audience: AUDIENCE });
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export async function startClientSession(clientId: number) {
  (await cookies()).set(CLIENT_COOKIE, await signClientToken(clientId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endClientSession() {
  (await cookies()).delete(CLIENT_COOKIE);
}

/** The signed-in client, or null. */
export async function currentClient(db: DB) {
  const id = await verifyClientToken((await cookies()).get(CLIENT_COOKIE)?.value);
  if (!id) return null;
  return (await db.query.clients.findFirst({ where: eq(t.clients.id, id) })) ?? null;
}

/** Whether sign-in emails can actually be delivered (or shown, in development and tests). */
export function emailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Without an email provider, codes can be shown on screen for local development
 * and automated tests. Never on a real production deployment.
 */
export function devCodesAllowed() {
  if (emailConfigured()) return false;
  if (process.env.VERCEL_ENV === "production" || onWorkers) return false;
  return process.env.NODE_ENV !== "production" || process.env.DEV_LOGIN_CODES === "1";
}

export function accountsEnabled() {
  return emailConfigured() || devCodesAllowed();
}
