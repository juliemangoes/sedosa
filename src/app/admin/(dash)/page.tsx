import Link from "next/link";
import { DateTime } from "luxon";
import { and, asc, eq, gte, inArray, lt, like } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";
import { Card, DepositBadge, Empty, Flash, PageHeader, StatusBadge, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const settings = await getSettings(db);
  const zone = settings.timezone;
  const now = DateTime.now().setZone(zone);
  const anchor = sp.week && DateTime.fromISO(sp.week, { zone }).isValid ? DateTime.fromISO(sp.week, { zone }) : now;
  const weekStart = anchor.startOf("week"); // Monday
  const weekEnd = weekStart.plus({ weeks: 1 });
  const showAll = sp.show === "all";
  const loc = sp.loc ? Number(sp.loc) : null;

  const locations = await db.select().from(t.locations).orderBy(asc(t.locations.sortOrder));
  const statuses: t.AppointmentStatus[] = showAll
    ? ["pending", "confirmed", "completed", "no_show", "cancelled", "expired"]
    : ["pending", "confirmed", "completed", "no_show"];
  const rows = await db
    .select({ a: t.appointments, c: t.clients })
    .from(t.appointments)
    .innerJoin(t.clients, eq(t.clients.id, t.appointments.clientId))
    .where(
      and(
        gte(t.appointments.startsAt, weekStart.toJSDate()),
        lt(t.appointments.startsAt, weekEnd.toJSDate()),
        inArray(t.appointments.status, statuses),
        loc ? eq(t.appointments.locationId, loc) : undefined,
      ),
    )
    .orderBy(asc(t.appointments.startsAt));

  // Things that need the owner's attention, regardless of the week shown.
  const attention = await db
    .select({ a: t.appointments, c: t.clients })
    .from(t.appointments)
    .innerJoin(t.clients, eq(t.clients.id, t.appointments.clientId))
    .where(and(gte(t.appointments.startsAt, now.minus({ days: 1 }).toJSDate()), eq(t.appointments.status, "confirmed"), eq(t.appointments.depositStatus, "due")))
    .orderBy(asc(t.appointments.startsAt))
    .limit(20);
  const flagged = await db
    .select({ a: t.appointments, c: t.clients })
    .from(t.appointments)
    .innerJoin(t.clients, eq(t.clients.id, t.appointments.clientId))
    .where(and(gte(t.appointments.startsAt, now.toJSDate()), like(t.appointments.adminNotes, "%⚠️%"), eq(t.appointments.status, "confirmed")))
    .limit(10);

  const today = rows.filter((r) => DateTime.fromJSDate(r.a.startsAt).setZone(zone).hasSame(now, "day") && r.a.status !== "cancelled" && r.a.status !== "expired");
  const days = Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }));
  const q = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { week: sp.week, show: sp.show, loc: sp.loc, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin?${p}`;
  };
  const weekRevenue = rows.filter((r) => ["confirmed", "completed", "pending"].includes(r.a.status)).reduce((n, r) => n + r.a.priceCents, 0);

  return (
    <>
      <PageHeader title="Appointments">
        <Link href="/admin/appointments/new" className={btnCls}>
          + New appointment
        </Link>
      </PageHeader>
      <Flash sp={sp} />

      {(attention.length > 0 || flagged.length > 0) && (
        <Card title="Needs attention" className="mb-6 border-amber-300 bg-amber-50/40">
          <ul className="divide-y divide-amber-200 text-sm">
            {flagged.map(({ a, c }) => (
              <li key={a.id} className="py-2">
                <Link href={`/admin/appointments/${a.id}`} className="font-medium underline">
                  {c.firstName} {c.lastName}
                </Link>{" "}
                · {DateTime.fromJSDate(a.startsAt).setZone(zone).toFormat("ccc LLL d, h:mm a")} · possible double booking
              </li>
            ))}
            {attention.map(({ a, c }) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                <Link href={`/admin/appointments/${a.id}`} className="font-medium underline">
                  {c.firstName} {c.lastName}
                </Link>
                <span>
                  {a.snapshot.serviceName} · {DateTime.fromJSDate(a.startsAt).setZone(zone).toFormat("ccc LLL d, h:mm a")}
                </span>
                <DepositBadge status={a.depositStatus} cents={a.depositCents} />
                <span className="text-stone-500">booked {DateTime.fromJSDate(a.createdAt).setZone(zone).toRelative()}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-stone-500">Today</p>
          <p className="mt-1 text-2xl font-semibold">{today.length} appointment{today.length === 1 ? "" : "s"}</p>
          {today[0] && (
            <p className="mt-1 text-sm text-stone-600">
              Next: {DateTime.fromJSDate((today.find((r) => r.a.endsAt > new Date()) ?? today[0]).a.startsAt).setZone(zone).toFormat("h:mm a")}
            </p>
          )}
        </Card>
        <Card>
          <p className="text-sm text-stone-500">This week</p>
          <p className="mt-1 text-2xl font-semibold">{rows.filter((r) => r.a.status !== "cancelled" && r.a.status !== "expired").length} booked</p>
          <p className="mt-1 text-sm text-stone-600">{money(weekRevenue)} in services</p>
        </Card>
        <Card>
          <p className="text-sm text-stone-500">Deposits outstanding</p>
          <p className="mt-1 text-2xl font-semibold">{attention.length}</p>
          <p className="mt-1 text-sm text-stone-600">{attention.length ? "Mark them paid when received" : "All caught up"}</p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link className={btnSecondaryCls} href={q({ week: weekStart.minus({ weeks: 1 }).toISODate()! })} aria-label="Previous week">
          ‹
        </Link>
        <Link className={btnSecondaryCls} href={q({ week: undefined })}>
          This week
        </Link>
        <Link className={btnSecondaryCls} href={q({ week: weekStart.plus({ weeks: 1 }).toISODate()! })} aria-label="Next week">
          ›
        </Link>
        <span className="ml-2 font-medium">
          {weekStart.toFormat("LLL d")} – {weekEnd.minus({ days: 1 }).toFormat("LLL d, yyyy")}
        </span>
        <form className="ml-auto flex flex-wrap items-center gap-2" action="/admin">
          {sp.week && <input type="hidden" name="week" value={sp.week} />}
          <select name="loc" defaultValue={sp.loc ?? ""} className={`${inputCls} w-auto`} aria-label="Location">
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select name="show" defaultValue={sp.show ?? ""} className={`${inputCls} w-auto`} aria-label="Which appointments">
            <option value="">Active only</option>
            <option value="all">Include canceled</option>
          </select>
          <button className={btnSecondaryCls} type="submit">
            Filter
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {days.map((d) => {
          const list = rows.filter((r) => DateTime.fromJSDate(r.a.startsAt).setZone(zone).hasSame(d, "day"));
          const isToday = d.hasSame(now, "day");
          return (
            <Card key={d.toISODate()} className={isToday ? "ring-2 ring-plum/30" : ""}>
              <h2 className="mb-2 font-semibold">
                {d.toFormat("cccc, LLL d")} {isToday && <span className="ml-1 text-sm font-normal text-plum">Today</span>}
              </h2>
              {list.length === 0 ? (
                <p className="text-sm text-stone-400">No appointments</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {list.map(({ a, c }) => (
                    <li key={a.id}>
                      <Link href={`/admin/appointments/${a.id}`} className="grid gap-1 py-3 hover:bg-stone-50 sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-4">
                        <span className="text-sm font-medium tabular-nums">
                          {DateTime.fromJSDate(a.startsAt).setZone(zone).toFormat("h:mm")}–{DateTime.fromJSDate(a.endsAt).setZone(zone).toFormat("h:mm a")}
                        </span>
                        <span className="min-w-0">
                          <span className="font-medium">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="text-stone-600">
                            {" "}
                            · {a.snapshot.serviceName}
                            {a.snapshot.addons.length > 0 && ` + ${a.snapshot.addons.length} add-on${a.snapshot.addons.length > 1 ? "s" : ""}`}
                          </span>
                          <span className="block text-xs text-stone-500">{a.snapshot.locationName}</span>
                        </span>
                        <span className="flex flex-wrap gap-1.5">
                          <StatusBadge status={a.status} />
                          <DepositBadge status={a.depositStatus} cents={a.depositCents} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
      {rows.length === 0 && <Empty>Nothing booked this week yet.</Empty>}
    </>
  );
}
