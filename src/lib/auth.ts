import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { sessionSecret } from "./session-secret";

export const SESSION_COOKIE = "sedosa_admin";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secretKey(): Uint8Array {
  const key = sessionSecret();
  if (!key) throw new Error("SESSION_SECRET must be set (at least 16 characters) in production.");
  return key;
}

export function adminPasswordConfigured() {
  return (!!process.env.ADMIN_PASSWORD || process.env.NODE_ENV !== "production") && !!sessionSecret();
}

function expectedPassword() {
  // Local development works out of the box with "admin".
  return process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== "production" ? "admin" : "");
}

export function checkPassword(given: string): boolean {
  const expected = expectedPassword();
  if (!expected) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function startSession() {
  const token = await new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload.role === "owner";
  } catch {
    return false;
  }
}

export async function isAdmin(): Promise<boolean> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Call at the top of every dashboard page and server action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
