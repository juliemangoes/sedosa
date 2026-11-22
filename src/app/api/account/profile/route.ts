import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { profileOf } from "@/lib/account";
import { getSettings } from "@/lib/settings";
import { applyOptIn } from "@/lib/whatsapp";
import { currentClient } from "@/lib/client-session";
import { normalizePhone } from "@/lib/format";
import { sameOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

const body = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  phone: z.string().max(40).default(""),
  smsOptIn: z.boolean().default(false),
  whatsappOptIn: z.boolean().optional(),
});

/** POST /api/account/profile — the signed-in client updates their details. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getDb();
  const me = await currentClient(db);
  if (!me) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details." }, { status: 422 });
  const phone = normalizePhone(parsed.data.phone);
  if (parsed.data.phone && phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Please enter a full phone number." }, { status: 422 });
  const [updated] = await db
    .update(t.clients)
    .set({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone,
      smsOptIn: parsed.data.smsOptIn,
      ...(parsed.data.whatsappOptIn !== undefined ? { whatsappOptIn: parsed.data.whatsappOptIn } : {}),
    })
    .where(eq(t.clients.id, me.id))
    .returning();
  if (parsed.data.whatsappOptIn !== undefined && parsed.data.whatsappOptIn !== me.whatsappOptIn) await applyOptIn(db, me.id, await getSettings(db));
  return NextResponse.json({ ok: true, account: profileOf(updated) });
}
