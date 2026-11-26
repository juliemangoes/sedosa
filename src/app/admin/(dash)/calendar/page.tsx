import Link from "next/link";
import { DateTime } from "luxon";
import { and, asc, eq, gt, gte, inArray, lt } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";
import { prettyName } from "@/lib/display";
import { parseHHMM } from "@/lib/availability";
import { AIChevronL, AIChevronR } from "./chevrons";
import { AIPlus } from "@/components/admin/icons";
import { DepositBadge, Empty, Flash, PageHeader, StatusBadge, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const HOUR_PX = 64;

const BLOCK: Record<t.AppointmentStatus, string> = {
  confirmed: "bg-rose/25 border-lacquer/60 text-ink hover:bg-rose/40",
  pending: "bg-[#fbe9c8] border-[#7a4a00]/30 text-[#7a4a00] hover:bg-[#fbe9c8]",
  completed: "bg-plaster-2 border-line-strong text-ink-soft hover:bg-plaster-2",
  no_show: "bg-[#fbe4e6] border-[#a61b2b]/30 text-[#a61b2b] hover:bg-[#fbe4e6]",
  cancelled: "bg-panel border-line-strong text-ink-soft line-through",
  expired: "bg-panel border-line-strong text-ink-soft",
};

type Item = { id: string; start: number; end: number };

/** Puts overlapping appointments side by side: returns lane index and lane count per item. */
function lanes<T extends Item>(items: T[]) {
  const out: (T & { lane: number; lanes: number })[] = [];
  let cluster: (T & { lane: number })[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const n = Math.max(1, ...cluster.map((c) => c.lane + 1));
    for (const c of cluster) out.push({ ...c, lanes: n });
    cluster = [];
  };
  for (const it of [...items].sort((a, b) => a.start - b.start || b.end - a.end)) {
    if (it.start >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    const used = new Set(cluster.filter((c) => c.end > it.start).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ ...it, lane });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();
  return out;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const settings = await getSettings(db);
  const zone = settings.timezone;
  const now = DateTime.now().setZone(zone);
  const anchor = sp.week && DateTime.fromISO(sp.week, { zone }).isValid ? DateTime.fromISO(sp.week, { zone }) : now;
  const weekStart = anchor.startOf("week");
  const weekEnd = weekStart.plus({ weeks: 1 });
  const showAll = sp.show === "all";
  const loc = sp.loc ? Number(sp.loc) : null;
  const days = Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }));

  const statuses: t.AppointmentStatus[] = showAll ? ["pending", "confirmed", "completed", "no_show", "cancelled", "expired"] : ["pending", "confirmed", "completed", "no_show"];
  const [locations, rows, off] = await Promise.all([
    db.select().from(t.locations).orderBy(asc(t.locations.sortOrder)),
    db
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
      .orderBy(asc(t.appointments.startsAt)),
    db.select().from(t.timeOff).where(and(lt(t.timeOff.startsAt, weekEnd.toJSDate()), gt(t.timeOff.endsAt, weekStart.toJSDate()))),
  ]);

  // Visible hours: the studios' opening hours, stretched to fit anything booked outside them.
  let open = 24 * 60;
  let close = 0;
  for (const l of locations) for (const ivs of Object.values(l.weeklyHours)) for (const iv of ivs) {
    open = Math.min(open, parseHHMM(iv.start));
    close = Math.max(close, parseHHMM(iv.end));
  }
  if (open >= close) [open, close] = [9 * 60, 20 * 60];
  for (const { a } of rows) {
    const s = DateTime.fromJSDate(a.startsAt).setZone(zone);
    const e = DateTime.fromJSDate(a.endsAt).setZone(zone);
    open = Math.min(open, s.hour * 60);
    close = Math.max(close, e.hour * 60 + (e.minute ? 60 : 0));
  }
  const startHour = Math.floor(open / 60);
  const endHour = Math.min(24, Math.ceil(close / 60));
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridH = hours.length * HOUR_PX;
  const minutesOf = (d: Date) => {
    const x = DateTime.fromJSDate(d).setZone(zone);
    return x.hour * 60 + x.minute;
  };
  const top = (min: number) => ((min - startHour * 60) / 60) * HOUR_PX;

  const q = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ week: sp.week, show: sp.show, loc: sp.loc, ...over })) if (v) p.set(k, v);
    return `/admin/calendar?${p}`;
  };
  const active = rows.filter(({ a }) => a.status !== "cancelled" && a.status !== "expired");
  const weekValue = active.filter(({ a }) => a.status !== "no_show").reduce((n, { a }) => n + a.priceCents, 0);
  const nowMin = now.hour * 60 + now.minute;

  return (
    <>
      <PageHeader title="Calendar" subtitle={`${active.length} booked · ${money(weekValue)} in services this week`}>
        <Link href="/admin/appointments/new" className={btnCls}>
          <AIPlus size={17} /> New appointment
        </Link>
      </PageHeader>
      <Flash sp={sp} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border border-line-strong bg-panel">
          <Link className="grid size-10 place-items-center rounded-l-xl hover:bg-plaster" href={q({ week: weekStart.minus({ weeks: 1 }).toISODate()! })} aria-label="Previous week">
            <AIChevronL />
          </Link>
          <Link className="border-x border-line px-3 py-2 text-sm font-medium hover:bg-plaster" href={q({ week: undefined })}>
            Today
          </Link>
          <Link className="grid size-10 place-items-center rounded-r-xl hover:bg-plaster" href={q({ week: weekStart.plus({ weeks: 1 }).toISODate()! })} aria-label="Next week">
            <AIChevronR />
          </Link>
        </div>
        <span className="font-display ml-1 text-xl font-medium">
          {weekStart.toFormat("LLL d")} – {weekEnd.minus({ days: 1 }).toFormat(weekStart.month === weekEnd.minus({ days: 1 }).month ? "d, yyyy" : "LLL d, yyyy")}
        </span>
        <form className="ml-auto flex flex-wrap items-center gap-2" action="/admin/calendar">
          {sp.week && <input type="hidden" name="week" value={sp.week} />}
          <select name="loc" defaultValue={sp.loc ?? ""} className={`${inputCls} w-auto!`} aria-label="Location">
            <option value="">All studios</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select name="show" defaultValue={sp.show ?? ""} className={`${inputCls} w-auto!`} aria-label="Which appointments">
            <option value="">Active only</option>
            <option value="all">Include canceled</option>
          </select>
          <button className={btnSecondaryCls} type="submit">
            Apply
          </button>
        </form>
      </div>

      {/* Desktop: week grid */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_1px_2px_rgba(58,15,28,0.04)] lg:block">
        <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-line">
          <div />
          {days.map((d) => {
            const isToday = d.hasSame(now, "day");
            return (
              <div key={d.toISODate()} className="border-l border-line px-2 py-3 text-center">
                <p className={`text-xs font-medium uppercase tracking-wider ${isToday ? "text-lacquer" : "text-ink-soft"}`}>{d.toFormat("ccc")}</p>
                <p className={`mx-auto mt-1 grid size-8 place-items-center rounded-full text-lg font-semibold ${isToday ? "bg-oxblood text-panel" : ""}`}>{d.day}</p>
              </div>
            );
          })}
        </div>
        <div tabIndex={0} role="region" aria-label="Week schedule" className="grid max-h-[70vh] grid-cols-[4rem_repeat(7,minmax(0,1fr))] overflow-y-auto focus-visible:outline-2 focus-visible:outline-lacquer">
          <div className="relative" style={{ height: gridH }}>
            {hours.map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[0.7rem] text-ink-soft" style={{ top: (h - startHour) * HOUR_PX }}>
                {h === startHour ? "" : DateTime.fromObject({ hour: h }).toFormat("h a")}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const dayItems = lanes(
              rows
                .filter(({ a }) => DateTime.fromJSDate(a.startsAt).setZone(zone).hasSame(d, "day"))
                .map(({ a, c }) => ({ id: a.id, start: minutesOf(a.startsAt), end: Math.max(minutesOf(a.startsAt) + 20, minutesOf(a.endsAt)), a, c })),
            );
            const blocks = off.filter((o) => (o.locationId === null || !loc || o.locationId === loc) && o.startsAt < d.endOf("day").toJSDate() && o.endsAt > d.startOf("day").toJSDate());
            const isToday = d.hasSame(now, "day");
            return (
              <div
                key={d.toISODate()}
                className={`relative border-l border-line ${isToday ? "bg-oxblood/[0.025]" : ""}`}
                style={{ height: gridH, backgroundImage: `repeating-linear-gradient(to bottom, #f1edf0 0, #f1edf0 1px, transparent 1px, transparent ${HOUR_PX}px)` }}
              >
                {blocks.map((o) => {
                  const s = Math.max(startHour * 60, o.startsAt < d.startOf("day").toJSDate() ? 0 : minutesOf(o.startsAt));
                  const e = Math.min(endHour * 60, o.endsAt > d.endOf("day").toJSDate() ? 24 * 60 : minutesOf(o.endsAt));
                  if (e <= s) return null;
                  return (
                    <div
                      key={o.id}
                      className="absolute inset-x-1 rounded-lg border border-dashed border-line-strong p-1.5 text-[0.7rem] text-ink-soft"
                      style={{ top: top(s), height: top(e) - top(s), backgroundImage: "repeating-linear-gradient(135deg, #f5f3f4 0 6px, #ffffff 6px 12px)" }}
                      title={o.reason || "Blocked"}
                    >
                      {o.reason || "Blocked"}
                    </div>
                  );
                })}
                {dayItems.map(({ a, c, start, end, lane, lanes: n }) => {
                  const h = Math.max(22, top(end) - top(start) - 2);
                  return (
                    <Link
                      key={a.id}
                      href={`/admin/appointments/${a.id}`}
                      className={`absolute overflow-hidden rounded-lg border px-2 py-1 text-xs shadow-[0_4px_10px_-6px_rgba(58,15,28,0.5)] transition ${BLOCK[a.status]}`}
                      style={{ top: top(start) + 1, height: h, left: `calc(${(lane / n) * 100}% + 3px)`, width: `calc(${100 / n}% - 6px)` }}
                      title={`${c.firstName} ${c.lastName} · ${prettyName(a.snapshot.serviceName)}`}
                    >
                      {h < 44 ? (
                        // Short visits: time and name on one line so nothing is clipped.
                        <p className="truncate leading-5">
                          <span className="font-semibold tabular-nums">{DateTime.fromJSDate(a.startsAt).setZone(zone).toFormat("h:mm")}</span>{" "}
                          <span className="font-medium">
                            {c.firstName} {c.lastName.slice(0, 1)}.
                          </span>
                        </p>
                      ) : (
                        <>
                          <p className="font-semibold tabular-nums">{DateTime.fromJSDate(a.startsAt).setZone(zone).toFormat("h:mm")}</p>
                          <p className="truncate font-medium">
                            {c.firstName} {c.lastName.slice(0, 1)}.
                          </p>
                          {h > 52 && <p className="truncate text-ink-soft">{prettyName(a.snapshot.serviceName)}</p>}
                        </>
                      )}
                    </Link>
                  );
                })}
                {isToday && nowMin >= startHour * 60 && nowMin <= endHour * 60 && (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-rose" style={{ top: top(nowMin) }}>
                    <span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-rose" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phones & tablets: agenda */}
      <div className="space-y-3 lg:hidden">
        {days.map((d) => {
          const list = rows.filter(({ a }) => DateTime.fromJSDate(a.startsAt).setZone(zone).hasSame(d, "day"));
          const isToday = d.hasSame(now, "day");
          return (
            <section key={d.toISODate()} className={`rounded-2xl border bg-panel p-4 ${isToday ? "border-lacquer/40 shadow-[0_8px_24px_-16px_rgba(58,15,28,0.5)]" : "border-line"}`}>
              <h2 className="mb-1 flex items-center gap-2 font-semibold">
                <span className={`grid size-8 place-items-center rounded-full text-sm ${isToday ? "bg-oxblood text-panel" : "bg-plaster-2"}`}>{d.day}</span>
                {d.toFormat("cccc")}
                {isToday && <span className="text-xs font-normal text-lacquer">Today</span>}
              </h2>
              {list.length === 0 ? (
                <p className="py-1 pl-10 text-sm text-ink-soft">Free</p>
              ) : (
                <ul className="divide-y divide-line">
                  {list.map(({ a, c }) => (
                    <li key={a.id}>
                      <Link href={`/admin/appointments/${a.id}`} className="flex items-center gap-3 py-2.5">
                        <span className="w-16 text-sm font-semibold tabular-nums">{DateTime.fromJSDate(a.startsAt).setZone(zone).toFormat("h:mm a")}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="block truncate text-sm text-ink-soft">{prettyName(a.snapshot.serviceName)}</span>
                        </span>
                        <span className="flex flex-col items-end gap-1">
                          <StatusBadge status={a.status} />
                          <DepositBadge status={a.depositStatus} cents={a.depositCents} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        {rows.length === 0 && <Empty>Nothing booked this week yet.</Empty>}
      </div>
    </>
  );
}
