"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { PublicData, PublicService } from "./types";
import { categoryLabel, prettyName, priceLabel, shortDuration } from "@/lib/display";
import { IconArrowRight, IconClock, IconSearch, IconX } from "@/components/landing/icons";
import { revealDelay } from "@/lib/motion";

export default function ServiceMenu({ data, onBook }: { data: PublicData; onBook: (s: PublicService) => void }) {
  const [cat, setCat] = useState<number | "all">("all");
  const [q, setQ] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const match = (s: PublicService) =>
      (cat === "all" || s.categoryId === cat) && (!query || `${s.name} ${s.description} ${s.categoryName}`.toLowerCase().includes(query));
    return data.categories.map((c) => ({ ...c, services: data.services.filter((s) => s.categoryId === c.id && match(s)) })).filter((g) => g.services.length);
  }, [data, cat, query]);
  const shown = groups.reduce((n, g) => n + g.services.length, 0);

  const pick = (c: number | "all") => {
    setCat(c);
    const top = listRef.current?.getBoundingClientRect().top ?? 0;
    // Bring the list into view if the visitor had scrolled past it.
    if (top < 0) listRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-16 py-16 sm:py-20">
      <div data-reveal className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <p className="kicker text-sm text-plum">The menu</p>
        <h2 id="services-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Choose your service
        </h2>
        <p className="mt-3 text-lg text-ink/75">
          Tap <strong>Book</strong> to see open times.
          {data.depositCents > 0 && ` A ${priceLabel(data.depositCents)} deposit secures your spot.`}
        </p>
        <div className="relative mx-auto mt-6 max-w-md">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/70" />
          <label htmlFor="service-search" className="sr-only">
            Search services
          </label>
          <input
            id="service-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: lami, tint, wax…"
            className="field rounded-full py-3 pl-11 pr-11"
            autoComplete="off"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-blush">
              <IconX size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="sticky top-16 z-20 mt-8 border-y border-petal-line/70 bg-blush/90 backdrop-blur-md">
        <div role="group" aria-label="Filter by category" className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 pr-12 [mask-image:linear-gradient(to_right,#000_85%,transparent)] sm:px-6 lg:[mask-image:none]">
          {[{ id: "all" as const, name: "All services" }, ...data.categories].map((c) => {
            const active = cat === c.id;
            const n = c.id === "all" ? data.services.length : data.services.filter((s) => s.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => pick(c.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  active ? "bg-black text-white" : "bg-white/80 ring-1 ring-petal-line hover:ring-plum"
                }`}
              >
                {c.id === "all" ? c.name : categoryLabel(c.name)}
                <span className={`ml-1.5 text-xs ${active ? "text-white/70" : "text-ink/70"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={listRef} className="mx-auto max-w-6xl scroll-mt-32 px-4 pt-8 sm:px-6">
        <p className="sr-only" aria-live="polite">
          {shown} service{shown === 1 ? "" : "s"} shown
        </p>
        {shown === 0 ? (
          <div data-reveal="scale" className="mx-auto max-w-md rounded-3xl bg-white/70 p-8 text-center ring-1 ring-petal-line">
            <p className="text-lg font-semibold">No services match “{q}”</p>
            <p className="mt-1 text-ink/70">Try another word, or browse everything.</p>
            <button
              type="button"
              className="btn-black mt-5"
              onClick={() => {
                setQ("");
                setCat("all");
              }}
            >
              Show all services
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {groups.map((g) => (
              <div key={g.id}>
                <h3 data-reveal className="mb-4 flex items-baseline gap-3 text-2xl font-semibold">
                  {categoryLabel(g.name)}
                  <span className="text-sm font-normal text-ink/70">
                    {g.services.length} service{g.services.length === 1 ? "" : "s"}
                  </span>
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {g.services.map((s, i) => (
                    <div key={s.id} data-reveal style={revealDelay((i % 2) * 110)}>
                      <ServiceCard service={s} onBook={() => onBook(s)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ServiceCard({ service: s, onBook }: { service: PublicService; onBook: () => void }) {
  const [open, setOpen] = useState(false);
  const descId = useId();
  const long = s.description.length > 150 || s.description.split("\n").filter(Boolean).length > 2;
  const name = prettyName(s.name);
  return (
    <article className="group flex h-full flex-col rounded-3xl bg-white/75 p-5 ring-1 ring-petal-line transition duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-[0_22px_44px_-22px_rgba(109,43,103,0.6)] hover:ring-plum/40 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-lg font-semibold leading-snug">{name}</h4>
        <p className="shrink-0 text-lg font-semibold">{priceLabel(s.priceCents)}</p>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/70">
        <IconClock size={15} /> {shortDuration(s.durationMin)}
        {s.addonIds.length > 0 && <span className="text-ink/70">· add-ons available</span>}
      </p>
      {s.description && (
        <div className="mt-3">
          <p id={descId} className={`whitespace-pre-line text-[0.95rem] leading-relaxed text-ink/80 ${open || !long ? "" : "line-clamp-3"}`}>
            {s.description}
          </p>
          {long && (
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={descId} className="mt-1 text-sm font-semibold text-plum underline-offset-4 hover:underline">
              {open ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="text-xs text-ink/70">{s.depositCents > 0 ? `${priceLabel(s.depositCents)} deposit to book` : "No deposit needed"}</span>
        <button type="button" className="btn-black px-6" onClick={onBook} aria-label={`Book ${name}`}>
          Book
          <IconArrowRight size={15} className="-ml-1 w-0 opacity-0 transition-all duration-300 group-hover:ml-0 group-hover:w-[15px] group-hover:opacity-100" />
        </button>
      </div>
    </article>
  );
}
