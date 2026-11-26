import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Serves an uploaded image. Category and gallery photos are public; receipts are owner-only. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const row = await db.query.media.findFirst({ where: eq(t.media.id, id) });
  if (!row) return new Response("Not found", { status: 404 });
  const isPublic = row.kind === "category" || row.kind === "gallery";
  if (!isPublic && !(await isAdmin())) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.mime,
      // Each upload gets a new id, so the bytes behind an id never change.
      "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
