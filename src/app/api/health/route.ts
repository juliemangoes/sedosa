import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — a launch check. Says which required settings the running site can
 * see (never their values) and, in plain words, whether the database answers.
 */
export async function GET() {
  const has = (k: string) => !!process.env[k];
  const dbUrl = process.env.DATABASE_URL ?? "";
  const settings = {
    DATABASE_URL: !dbUrl ? "missing" : /^postgres(ql)?:\/\//.test(dbUrl) ? "set" : "set, but it doesn't start with postgresql://",
    ADMIN_PASSWORD: has("ADMIN_PASSWORD") ? "set" : "missing",
    SESSION_SECRET: (process.env.SESSION_SECRET ?? "").length >= 16 ? "set" : has("SESSION_SECRET") ? "too short (16+ characters)" : "missing",
    APP_URL: has("APP_URL") ? "set" : "missing",
    CRON_SECRET: has("CRON_SECRET") ? "set" : "missing (recommended)",
    email: has("RESEND_API_KEY") && has("EMAIL_FROM") ? "set" : "not set up (optional)",
  };

  let database: string;
  if (settings.DATABASE_URL === "missing") {
    database = "not checked: DATABASE_URL isn't set for the running site (add it under Settings → Variables and secrets, as a Secret)";
  } else {
    try {
      const db = await getDb();
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.services);
      database = `ok (${n} services)`;
    } catch (e) {
      database = explain(e);
    }
  }

  const ok = database.startsWith("ok") && settings.ADMIN_PASSWORD === "set" && settings.SESSION_SECRET === "set" && settings.APP_URL === "set";
  return NextResponse.json({ ok, database, settings }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

/** A plain-words reason for a database failure, without echoing hostnames or credentials. */
function explain(e: unknown): string {
  const err = e as { message?: string; code?: string; cause?: { message?: string; code?: string } };
  const msg = `${err?.cause?.message ?? ""} ${err?.message ?? ""}`;
  const code = err?.cause?.code ?? err?.code;
  if (code === "28P01" || /password authentication failed/i.test(msg)) return "the database rejected the user name or password in DATABASE_URL";
  if (code === "3D000" || /database .* does not exist/i.test(msg)) return "the database named in DATABASE_URL doesn't exist";
  if (code === "42P01" || /relation .* does not exist/i.test(msg)) return "the database has no tables yet: the build's `npm run db:setup` ran against a different database (or not at all)";
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|dns/i.test(msg)) return "the database host in DATABASE_URL wasn't found";
  if (/timeout|timed out/i.test(msg)) return "the database didn't answer in time";
  if (/ssl|tls|certificate/i.test(msg)) return "the secure connection to the database failed";
  if (/postgres:\/\/ connection string/i.test(msg)) return "DATABASE_URL must be a postgresql:// connection string";
  return `couldn't reach the database (${code ?? "unknown error"})`;
}
