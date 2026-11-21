import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { findByToken, getAvailability } from "@/lib/booking";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?serviceId=1&locationId=any&addons=2,3&start=2026-11-23&days=5
 * For rescheduling pass &token=<manage token> instead of serviceId/addons.
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const q = req.nextUrl.searchParams;
    const loc = q.get("locationId");
    const locationId = !loc || loc === "any" ? ("any" as const) : Number(loc);
    const start = q.get("start") ?? undefined;
    const days = Number(q.get("days") ?? 5);
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) return NextResponse.json({ error: "Bad start date" }, { status: 400 });

    const token = q.get("token");
    if (token) {
      const found = await findByToken(db, token);
      if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const a = found.appointment;
      const data = await getAvailability(db, {
        serviceId: a.serviceId,
        locationId,
        addonIds: a.snapshot.addons.map((x) => x.id),
        startDate: start,
        days,
        excludeAppointmentId: a.id,
      });
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    }

    const serviceId = Number(q.get("serviceId"));
    const addonIds = (q.get("addons") ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter(Number.isFinite);
    const data = await getAvailability(db, { serviceId, locationId, addonIds, startDate: start, days });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
