import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ledger, resolvePeriod, toCsv } from "@/lib/finance";

export const dynamic = "force-dynamic";

/** GET /api/admin/finance/export?period=…&from=…&to=… — the ledger as CSV (for taxes / your accountant). */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const q = req.nextUrl.searchParams;
  const db = await getDb();
  const settings = await getSettings(db);
  const p = resolvePeriod(settings.timezone, q.get("period") ?? undefined, q.get("from") ?? undefined, q.get("to") ?? undefined);
  const csv = toCsv(await ledger(db, settings.timezone, p.from, p.to));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sedosa-finance-${p.from}-to-${p.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
