"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicData, PublicService } from "./types";
import ServiceSheet from "./ServiceSheet";
import { categoryLabel, prettyName, priceLabel, shortDuration } from "@/lib/display";
import CategoryIcon from "@/components/landing/CategoryIcon";
import { IconChevronRight, IconClock, IconSearch, IconX } from "@/components/landing/icons";

/**
 * The service menu, laid out like a salon price list: categories with compact
 * rows, a scroll-following category nav (sticky chips on phones, sidebar on
 * desktop), search, and a details sheet for each service.
 */
export default function ServiceMenu({ data, onBook }: { data: PublicData; onBook: (s: PublicService) => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<number | null>(data.categories[0]?.id ?? null);
  const [details, setDetails] = useState<PublicService | null>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const query = q.trim().toLowerCase();
  const popular = useMemo(() => new Set(data.popularIds), [data.popularIds]);

  const groups = useMemo(() => {
    const match = (s: PublicService) => !query || `${s.name} ${s.description} ${s.categoryName}`.toLowerCase().includes(query);
    return data.categories
      .map((c) => {
        const all = data.services.filter((s) => s.categoryId === c.id);
        const paid = all.map((s) => s.priceCents).filter((p) => p > 0);
        return {
          ...c,
          services: all.filter(match),
          fromCents: paid.length ? Math.min(...paid) : 0,
          hasFree: all.some((s) => s.priceCents === 0),
        };
      })
      .filter((g) => g.services.length);
  }, [data, query]);
  const shown = groups.reduce((n, g) => n + g.services.length, 0);
  const groupKey = groups.map((g) => g.id).join(",");

  // Highlight the category currently in view.
  useEffect(() => {
    const els = groups.map((g) => document.getElementById(`cat-${g.id}`)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(Number(hit.target.getAttribute("data-cat")));
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey]);

  // Keep the active chip visible in the phone chip bar (horizontal scroll only).
  useEffect(() => {
    const bar = chipsRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (bar && chip) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  const jump = (id: number) => {
    setActive(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const search = (id: string) => (
    <div className="relative">
      <IconSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/70" />
      <label htmlFor={id} className="sr-only">
        Search services
      </label>
      <input
        id={id}
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
  );

  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-16 pb-16 pt-10 sm:pb-24 sm:pt-14">
      <div data-reveal className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <p className="kicker text-sm text-plum">The menu</p>
        <h2 id="services-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Choose your service
        </h2>
        <p className="mt-3 text-lg text-ink/75">
          Tap a service for details, or <strong>Book</strong> to see open times.
        </p>
      </div>

      {/* Phones & tablets: search + sticky category chips */}
      <div className="mx-auto mt-6 max-w-md px-4 lg:hidden">{search("service-search")}</div>
      <div className="sticky top-16 z-20 mt-5 border-y border-petal-line/70 bg-blush/90 backdrop-blur-md lg:hidden">
        <div ref={chipsRef} role="group" aria-label="Jump to category" className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              data-chip={g.id}
              aria-current={active === g.id ? "true" : undefined}
              onClick={() => jump(g.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                active === g.id ? "bg-black text-white" : "bg-white/80 ring-1 ring-petal-line hover:ring-plum"
              }`}
            >
              <CategoryIcon name={g.name} size={16} className={active === g.id ? "text-neon" : "text-plum"} />
              {categoryLabel(g.name)}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:mt-12 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        {/* Desktop: sticky sidebar */}
        <aside className="hidden lg:block" aria-label="Menu navigation">
          <div className="sticky top-24 space-y-5">
            {search("service-search-desktop")}
            <nav aria-label="Jump to category">
              <ul className="space-y-1">
                {groups.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      aria-current={active === g.id ? "true" : undefined}
                      onClick={() => jump(g.id)}
                      className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                        active === g.id ? "bg-black text-white shadow-[0_10px_28px_-14px_rgba(0,0,0,0.7)]" : "hover:bg-white/70"
                      }`}
                    >
                      <span className={`grid size-9 shrink-0 place-items-center rounded-xl transition ${active === g.id ? "bg-white/10 text-neon" : "bg-white/80 text-plum ring-1 ring-petal-line"}`}>
                        <CategoryIcon name={g.name} size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{categoryLabel(g.name)}</span>
                        <span className={`block text-xs ${active === g.id ? "text-white/70" : "text-ink/70"}`}>
                          {g.services.length} service{g.services.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <IconChevronRight size={16} className={`shrink-0 transition ${active === g.id ? "translate-x-0.5 text-neon" : "opacity-0 group-hover:opacity-60"}`} />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            {data.depositCents > 0 && (
              <p className="rounded-2xl bg-white/60 p-4 text-sm leading-relaxed text-ink/80 ring-1 ring-petal-line">
                A {priceLabel(data.depositCents)} deposit secures your spot.{" "}
                <a href="#policies" className="font-semibold text-plum underline-offset-4 hover:underline">
                  Booking policies
                </a>
              </p>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          <p className="sr-only" aria-live="polite">
            {query ? `${shown} service${shown === 1 ? "" : "s"} match “${q}”` : ""}
          </p>
          {shown === 0 ? (
            <div data-reveal="scale" className="mx-auto max-w-md rounded-3xl bg-white/70 p-8 text-center ring-1 ring-petal-line">
              <p className="text-lg font-semibold">No services match “{q}”</p>
              <p className="mt-1 text-ink/70">Try another word, or browse the full menu.</p>
              <button type="button" className="btn-black mt-5" onClick={() => setQ("")}>
                Show all services
              </button>
            </div>
          ) : (
            <div className="space-y-10 sm:space-y-12">
              {groups.map((g) => (
                <section key={g.id} id={`cat-${g.id}`} data-cat={g.id} aria-labelledby={`cat-${g.id}-title`} className="scroll-mt-36 lg:scroll-mt-24">
                  <div data-reveal className="mb-3 flex items-center gap-3.5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-black text-neon shadow-[0_10px_24px_-12px_rgba(0,0,0,0.6)]">
                      <CategoryIcon name={g.name} size={24} />
                    </span>
                    <div>
                      <h3 id={`cat-${g.id}-title`} className="text-2xl font-semibold leading-tight">
                        {categoryLabel(g.name)}
                      </h3>
                      <p className="text-sm text-ink/70">
                        {g.services.length} service{g.services.length === 1 ? "" : "s"}
                        {g.fromCents > 0 && ` · from ${priceLabel(g.fromCents)}`}
                        {g.hasFree && " · free consultation"}
                      </p>
                    </div>
                  </div>
                  <ul data-reveal className="divide-y divide-petal-line/70 overflow-hidden rounded-3xl bg-white/80 ring-1 ring-petal-line">
                    {g.services.map((s) => (
                      <ServiceRow key={s.id} service={s} popular={popular.has(s.id)} onDetails={() => setDetails(s)} onBook={() => onBook(s)} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <ServiceSheet data={data} service={details} popular={!!details && popular.has(details.id)} onClose={() => setDetails(null)} onBook={onBook} />
    </section>
  );
}

function ServiceRow({ service: s, popular, onDetails, onBook }: { service: PublicService; popular: boolean; onDetails: () => void; onBook: () => void }) {
  const name = prettyName(s.name);
  const firstLine = s.description.split("\n").find((l) => l.trim()) ?? "";
  return (
    <li className="group relative flex items-center gap-3 p-4 transition-colors duration-200 hover:bg-white sm:gap-5 sm:px-6 sm:py-5">
      <button
        type="button"
        onClick={onDetails}
        aria-haspopup="dialog"
        aria-label={`${name}, details`}
        className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-plum"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[1.05rem] font-semibold leading-snug">{name}</span>
          {popular && <span className="rounded-full bg-neon/20 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider text-plum">Popular</span>}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-sm text-ink/70">
          <IconClock size={14} /> {shortDuration(s.durationMin)}
          <span className="inline-flex items-center gap-0.5 font-medium text-plum transition-transform duration-300 group-hover:translate-x-0.5">
            · Details <IconChevronRight size={13} />
          </span>
        </span>
        {firstLine && <span className="mt-1 hidden text-sm text-ink/70 sm:line-clamp-1">{firstLine}</span>}
      </button>
      <div className="relative z-10 flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-5">
        <span className="text-lg font-semibold tabular-nums">{priceLabel(s.priceCents)}</span>
        <button type="button" className="btn-black px-5 py-2.5" onClick={onBook} aria-label={`Book ${name}`}>
          Book
        </button>
      </div>
    </li>
  );
}
