import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { AccountError, verifyLoginLink } from "@/lib/account";
import { startClientSession } from "@/lib/client-session";

export const dynamic = "force-dynamic";

/** GET /account/verify?t=… — the one-click link from the sign-in email. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  try {
    const db = await getDb();
    const client = await verifyLoginLink(db, token);
    await startClientSession(client.id);
    return NextResponse.redirect(new URL("/account?welcome=1", req.url));
  } catch (e) {
    if (!(e instanceof AccountError)) console.error(e);
    return NextResponse.redirect(new URL("/account?error=link", req.url));
  }
}
