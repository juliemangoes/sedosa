/** Shared by the request proxy and the auth helpers so both always agree. */
export function sessionSecret(): Uint8Array | null {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV !== "production") return new TextEncoder().encode("dev-only-session-secret-change-me");
  return null;
}
