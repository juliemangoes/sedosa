"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import type { AvailabilityResponse, Slot } from "./types";

type Props = {
  /** Query string (without days/start) for /api/availability. */
  query: string;
  timezone: string;
  selected: Slot | null;
  onSelect: (slot: Slot) => void;
  emptyMessage?: string;
};

function useDays() {
  const [days, setDays] = useState(5);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setDays(mq.matches ? 3 : 5);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return days;
}

export default function TimeGrid({ query, timezone, selected, onSelect, emptyMessage }: Props) {
  const days = useDays();
  const [start, setStart] = useState<string | undefined>(undefined);
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A different service/add-on combination starts over at the first open week.
  useEffect(() => setStart(undefined), [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `/api/availability?${query}&days=${days}${start ? `&start=${start}` : ""}`;
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Could not load times");
        return j as AvailabilityResponse;
      })
      .then((j) => !cancelled && setData(j))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, start, days]);

  const zoneLabel = useMemo(() => {
    const dt = DateTime.now().setZone(timezone);
    return `${dt.offsetNameLong ?? timezone} (GMT${dt.toFormat("ZZ")})`;
  }, [timezone]);

  const shift = (n: number) => {
    if (!data) return;
    setStart(DateTime.fromISO(data.startDate, { zone: timezone }).plus({ days: n }).toISODate()!);
  };
  const canPrev = !!data && data.startDate > data.today;
  const canNext = !!data && data.dates.at(-1)!.date < data.lastDate;
  const total = data?.dates.reduce((n, d) => n + d.slots.length, 0) ?? 0;

  return (
    <section aria-label="Choose a time" className="rounded-sm bg-petal p-4 shadow-sm sm:p-6">
      <p className="label-caps mb-4 text-center">Time zone: {zoneLabel}</p>
      {error && <p className="py-6 text-center text-red-800">{error}</p>}
      {!error && (
        <div className="flex items-start gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => shift(-days)}
            disabled={!canPrev || loading}
            aria-label="Earlier dates"
            className="mt-3 rounded p-1 text-2xl leading-none text-plum disabled:opacity-25"
          >
            ‹
          </button>
          <div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
            {(data?.dates ?? Array.from({ length: days }, (_, i) => ({ date: String(i), slots: [] as Slot[] }))).map((d) => {
              const dt = DateTime.fromISO(d.date, { zone: timezone });
              return (
                <div key={d.date} className="min-w-0">
                  <div className="mb-3 text-center leading-tight">
                    {dt.isValid ? (
                      <>
                        <div className="font-semibold">{dt.toFormat("cccc")}</div>
                        <div className="text-sm">{dt.toFormat("LLL d")}</div>
                      </>
                    ) : (
                      <div className="h-10" />
                    )}
                  </div>
                  <div className={`flex flex-col gap-2 ${loading ? "opacity-40" : ""}`}>
                    {d.slots.map((s) => {
                      const isSel = selected?.start === s.start;
                      return (
                        <button
                          key={s.start}
                          type="button"
                          onClick={() => onSelect(s)}
                          aria-pressed={isSel}
                          className={`rounded-sm border px-1 py-2.5 text-sm transition-colors ${
                            isSel
                              ? "border-black bg-black text-white"
                              : "border-petal-line bg-white/40 hover:border-plum hover:bg-white"
                          }`}
                        >
                          {DateTime.fromISO(s.start).setZone(timezone).toFormat("h:mm a")}
                        </button>
                      );
                    })}
                    {!loading && dt.isValid && d.slots.length === 0 && (
                      <span className="py-2 text-center text-sm text-ink/40">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => shift(days)}
            disabled={!canNext || loading}
            aria-label="Later dates"
            className="mt-3 rounded p-1 text-2xl leading-none text-plum disabled:opacity-25"
          >
            ›
          </button>
        </div>
      )}
      {!loading && !error && total === 0 && (
        <p className="mt-4 text-center text-sm">
          {canNext ? "No openings these days — use the arrow to see later dates." : emptyMessage ?? "No online availability right now."}
        </p>
      )}
    </section>
  );
}
