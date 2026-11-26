"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import type { AvailabilityResponse, Slot } from "./types";
import { IconChevronLeft, IconChevronRight, IconMoon, IconSun, IconSunset } from "@/components/landing/icons";

const DAYS = 7;

type Props = {
  /** Query string (without days/start) for /api/availability. */
  query: string;
  timezone: string;
  selected: Slot | null;
  onSelect: (slot: Slot | null) => void;
  emptyMessage?: string;
};

function zoneName(tz: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longGeneric" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

const count = (r: AvailabilityResponse) => r.dates.reduce((n, d) => n + d.slots.length, 0);

export default function SlotPicker({ query, timezone, selected, onSelect, emptyMessage }: Props) {
  const today = useMemo(() => DateTime.now().setZone(timezone).toISODate()!, [timezone]);
  // The visible week, remembered per query so a new service/add-on combo starts fresh.
  const [win, setWin] = useState<{ q: string; start: string | null }>({ q: query, start: null });
  const start = win.q === query ? win.start : null;
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // A time picked from the landing page opens on its own day.
  const [day, setDay] = useState<string | null>(() => (selected ? DateTime.fromISO(selected.start).setZone(timezone).toISODate() : null));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const get = async (s?: string) => {
      const r = await fetch(`/api/availability?${query}&days=${DAYS}${s ? `&start=${s}` : ""}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Couldn't load open times.");
      return j as AvailabilityResponse;
    };
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let res = await get(start ?? today);
        // Nothing this week on first load: jump straight to the first opening.
        if (start === null && count(res) === 0) {
          const jump = await get();
          if (count(jump) > 0) res = jump;
        }
        if (cancelled) return;
        setData(res);
        setDay((prev) =>
          prev && res.dates.some((d) => d.date === prev && d.slots.length) ? prev : (res.dates.find((d) => d.slots.length)?.date ?? null),
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load open times.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, start, today, attempt]);

  const go = (days: number) => {
    if (!data) return;
    onSelect(null);
    setWin({ q: query, start: DateTime.fromISO(data.startDate, { zone: timezone }).plus({ days }).toISODate()! });
  };

  const canPrev = !!data && data.startDate > data.today;
  const canNext = !!data && data.dates.at(-1)!.date < data.lastDate;
  const daySlots = data?.dates.find((d) => d.date === day)?.slots ?? [];
  const groups = [
    { key: "morning", label: "Morning", Icon: IconSun, slots: [] as Slot[] },
    { key: "afternoon", label: "Afternoon", Icon: IconSunset, slots: [] as Slot[] },
    { key: "evening", label: "Evening", Icon: IconMoon, slots: [] as Slot[] },
  ];
  for (const s of daySlots) {
    const h = DateTime.fromISO(s.start).setZone(timezone).hour;
    groups[h < 12 ? 0 : h < 17 ? 1 : 2].slots.push(s);
  }

  const first = data ? DateTime.fromISO(data.dates[0].date, { zone: timezone }) : null;
  const last = data ? DateTime.fromISO(data.dates.at(-1)!.date, { zone: timezone }) : null;
  const monthLabel = first && last ? (first.month === last.month ? first.toFormat("LLLL yyyy") : `${first.toFormat("LLL")} – ${last.toFormat("LLL yyyy")}`) : "";
  const total = data ? count(data) : 0;

  return (
    <section aria-label="Choose a time" className="rounded-[1.75rem] bg-panel p-4 shadow-[0_20px_44px_-30px_rgba(58,15,28,0.5)] ring-1 ring-line sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-[1.5rem] font-medium" aria-live="polite">
          {monthLabel || " "}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => go(-DAYS)}
            disabled={!canPrev || loading}
            aria-label="Earlier dates"
            className="grid size-10 place-items-center rounded-full ring-1 ring-line-strong transition hover:bg-plaster hover:ring-lacquer disabled:opacity-30"
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => go(DAYS)}
            disabled={!canNext || loading}
            aria-label="Later dates"
            className="grid size-10 place-items-center rounded-full ring-1 ring-line-strong transition hover:bg-plaster hover:ring-lacquer disabled:opacity-30"
          >
            <IconChevronRight />
          </button>
        </div>
      </div>

      {error ? (
        <div className="py-10 text-center">
          <p className="text-[#a61b2b]">{error}</p>
          <button type="button" className="btn-primary mt-4" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div role="group" aria-label="Choose a day" className={`mt-4 grid grid-cols-7 gap-1.5 sm:gap-2 ${loading && data ? "opacity-50" : ""}`}>
            {!data
              ? Array.from({ length: DAYS }, (_, i) => <div key={i} className="h-[4.6rem] animate-pulse rounded-2xl bg-plaster-2" />)
              : data.dates.map((d, di) => {
                  const dt = DateTime.fromISO(d.date, { zone: timezone });
                  const n = d.slots.length;
                  const sel = d.date === day;
                  return (
                    <div key={d.date} className="animate-rise" style={{ animationDelay: `${di * 35}ms` }}>
                    <button
                      type="button"
                      disabled={!n}
                      aria-pressed={sel}
                      data-day={d.date}
                      aria-label={`${dt.toFormat("cccc, LLLL d")}: ${n ? `${n} opening${n === 1 ? "" : "s"}` : "no openings"}`}
                      onClick={() => {
                        setDay(d.date);
                        onSelect(null);
                      }}
                      className={`flex w-full flex-col items-center rounded-2xl py-2 transition sm:py-2.5 ${
                        sel
                          ? "bg-oxblood text-plaster shadow-[0_10px_22px_-12px_rgba(58,15,28,0.8)]"
                          : n
                            ? "ring-1 ring-line-strong hover:bg-plaster hover:ring-lacquer"
                            : "cursor-not-allowed text-ink-soft opacity-60"
                      }`}
                    >
                      <span className="text-[0.65rem] font-medium uppercase tracking-[0.12em]">{dt.toFormat("ccc")}</span>
                      <span className="font-display text-[1.5rem] font-medium leading-tight tabular-nums">{dt.day}</span>
                      <span aria-hidden="true" className={`mt-0.5 size-1.5 rounded-full transition-colors ${n ? (sel ? "bg-rose" : "bg-lacquer") : "bg-transparent"}`} />
                    </button>
                    </div>
                  );
                })}
          </div>

          <div className={`mt-6 min-h-40 ${loading && data ? "opacity-50" : ""}`} aria-live="polite">
            {!data ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-plaster-2" />
                ))}
              </div>
            ) : total === 0 ? (
              <div className="rounded-2xl bg-plaster p-6 text-center">
                <p className="font-display text-xl font-medium">No openings these days</p>
                <p className="mt-1 text-sm text-ink-soft">{canNext ? "Try the next week, new times open up often." : (emptyMessage ?? "No online availability right now.")}</p>
                {canNext && (
                  <button type="button" className="btn-primary mt-4" onClick={() => go(DAYS)}>
                    Next week <IconChevronRight size={16} />
                  </button>
                )}
              </div>
            ) : (
              <>
                {day && (
                  <p className="font-display mb-4 text-[1.35rem] font-medium">
                    {DateTime.fromISO(day, { zone: timezone }).toFormat("cccc, LLLL d")}
                    <span className="font-sans ml-2 text-sm font-normal text-ink-soft">
                      {daySlots.length} time{daySlots.length === 1 ? "" : "s"}
                    </span>
                  </p>
                )}
                <div key={day ?? "none"} className="space-y-5">
                  {groups
                    .filter((g) => g.slots.length)
                    .map((g) => (
                      <div key={g.key}>
                        <p className="flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
                          <g.Icon size={16} /> {g.label}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {g.slots.map((s) => {
                            const sel = selected?.start === s.start;
                            const order = daySlots.indexOf(s);
                            return (
                              <div key={s.start} className="animate-rise" style={{ animationDelay: `${Math.min(order, 16) * 22}ms` }}>
                              <button
                                type="button"
                                data-slot
                                aria-pressed={sel}
                                onClick={() => onSelect(s)}
                                className={`flex w-full items-baseline justify-center gap-1 rounded-2xl px-1 py-2.5 transition duration-200 ${
                                  sel
                                    ? "bg-oxblood text-plaster shadow-[0_10px_22px_-12px_rgba(58,15,28,0.8)]"
                                    : "ring-1 ring-line-strong hover:bg-plaster hover:ring-lacquer"
                                }`}
                              >
                                <span className="font-display text-[1.2rem] font-medium tabular-nums">{DateTime.fromISO(s.start).setZone(timezone).toFormat("h:mm")}</span>{" "}
                                <span className="text-[0.65rem] font-medium uppercase tracking-[0.1em]">{DateTime.fromISO(s.start).setZone(timezone).toFormat("a")}</span>
                              </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
      <p className="mt-5 text-center text-xs text-ink-soft">Times shown in {zoneName(timezone)}</p>
    </section>
  );
}
