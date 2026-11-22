import { NextResponse, type NextRequest } from "next/server";
import { endClientSession } from "@/lib/client-session";
import { sameOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await endClientSession();
  return NextResponse.json({ ok: true });
}
