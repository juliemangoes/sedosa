import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { AccountError, profileOf, savedAnswers, verifyLoginCode } from "@/lib/account";
import { startClientSession } from "@/lib/client-session";
import { sameOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST /api/account/verify { email, code } — signs the client in. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
  try {
    const db = await getDb();
    const client = await verifyLoginCode(db, String(body?.email ?? ""), String(body?.code ?? ""));
    await startClientSession(client.id);
    return NextResponse.json({ ok: true, account: profileOf(client), savedAnswers: await savedAnswers(db, client.id) });
  } catch (e) {
    if (e instanceof AccountError) return NextResponse.json({ error: e.message, code: e.code }, { status: 422 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
