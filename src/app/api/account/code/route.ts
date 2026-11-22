import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { AccountError, requestLoginCode } from "@/lib/account";
import { accountsEnabled, devCodesAllowed } from "@/lib/client-session";
import { appUrl } from "@/lib/env";
import { sameOrigin } from "@/lib/http";
import { sendLoginCode } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Light per-IP throttle on top of the per-email limit.
const hits = new Map<string, number[]>();
function throttled(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 12;
}

/** POST /api/account/code { email } — emails a sign-in code and link. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!accountsEnabled()) return NextResponse.json({ error: "Account sign-in isn't available yet. Please contact the studio." }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(ip)) return NextResponse.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  try {
    const db = await getDb();
    const { email, code, linkToken } = await requestLoginCode(db, String(body?.email ?? ""));
    const link = `${appUrl(req)}/account/verify?t=${encodeURIComponent(linkToken)}`;
    const status = await sendLoginCode(db, email, code, link);
    if (status === "failed") return NextResponse.json({ error: "We couldn't send the email. Please try again." }, { status: 502 });
    return NextResponse.json({ ok: true, email, ...(devCodesAllowed() ? { devCode: code } : {}) });
  } catch (e) {
    if (e instanceof AccountError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "rate_limited" ? 429 : 422 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
