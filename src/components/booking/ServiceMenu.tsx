"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicData, PublicService } from "./types";
import ServiceSheet from "./ServiceSheet";
import { categoryLabel, prettyName, priceLabel, shortDuration } from "@/lib/display";
import { IconChevronLeft, IconChevronRight, IconSearch, IconX } from "@/components/landing/icons";

type Group = PublicData["categories"][number] & { services: PublicService[]; fromCents: number; hasFree: boolean };

/**
 * The menu room. Categories hang on the rose wall as oval vanity mirrors (the
 * owner's photo in each, or a monogram on rose glass) and act as tabs;
 * choosing one sends a light sheen across its glass and lays that category's
 * services out below on a plaster menu card. Search covers everything.
 */
export default function ServiceMenu({ data, onBook }: { data: PublicData; onBook: (s: PublicService) => void }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(data.categories[0]?.id ?? null);
  const [sheen, setSheen] = useState(0);
  const [details, setDetails] = useState<PublicService | null>(null);
  const [miniNav, setMiniNav] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const query = q.trim().toLowerCase();
  const popular = useMemo(() => new Set(data.popularIds), [data.popularIds]);

  const groups: Group[] = useMemo(
    () =>
      data.categories
        .map((c) => {
          const services = data.services.filter((s) => s.categoryId === c.id);
          const paid = services.map((s) => s.priceCents).filter((p) => p > 0);
          return { ...c, services, fromCents: paid.length ? Math.min(...paid) : 0, hasFree: services.some((s) => s.priceCents === 0) };
        })
        .filter((g) => g.services.length),
    [data],
  );
  const results = useMemo(() => {
    if (!query) return [];
    return groups
      .map((g) => ({ ...g, services: g.services.filter((s) => `${s.name} ${s.description} ${s.categoryName}`.toLowerCase().includes(query)) }))
      .filter((g) => g.services.length);
  }, [groups, query]);
  const current = groups.find((g) => g.id === selected) ?? groups[0];
  const nextGroup = current ? groups[(groups.findIndex((g) => g.id === current.id) + 1) % groups.length] : null;

  const select = useCallback((id: number, opts: { scroll?: "panel" } = {}) => {
    setSelected(id);
    setSheen((n) => n + 1);
    setQ("");
    const card = trackRef.current?.querySelector<HTMLElement>(`[data-cat-card="${id}"]`);
    if (card && trackRef.current) {
      const t = trackRef.current;
      t.scrollTo({ left: card.offsetLeft - (t.clientWidth - card.clientWidth) / 2, behavior: "smooth" });
    }
    if (opts.scroll === "panel") requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  // Hero shortcuts link to #cat-<id>: open that category and bring its list into view.
  useEffect(() => {
    const fromHash = () => {
      const m = /^#cat-(\d+)$/.exec(window.location.hash);
      if (m && groups.some((g) => g.id === Number(m[1]))) select(Number(m[1]), { scroll: "panel" });
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [groups, select]);

  // Compact category bar once the mirror wall has scrolled away.
  useEffect(() => {
    const el = wallRef.current;
    const panel = panelRef.current;
    if (!el || !panel) return;
    let wallGone = false;
    let panelVisible = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === el) wallGone = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === panel) panelVisible = e.isIntersecting;
      }
      setMiniNav(wallGone && panelVisible);
    });
    io.observe(el);
    io.observe(panel);
    return () => io.disconnect();
  }, []);

  const onTrackScroll = () => {
    const t = trackRef.current;
    if (!t) return;
    setEdges({ start: t.scrollLeft < 8, end: t.scrollLeft + t.clientWidth > t.scrollWidth - 8 });
  };
  useEffect(onTrackScroll, [groups.length]);
  const page = (dir: 1 | -1) => trackRef.current?.scrollBy({ left: dir * trackRef.current.clientWidth * 0.8, behavior: "smooth" });

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? groups.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const g = groups[(next + groups.length) % groups.length];
    select(g.id);
    trackRef.current?.querySelector<HTMLElement>(`[data-cat-card="${g.id}"]`)?.focus();
  };

  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-16">
      {/* A brass dado rail divides the front wall from the menu wall */}
      <div aria-hidden="true" className="h-[7px] border-y border-brass bg-rose-hi" />

      <div ref={wallRef} className="on-rose lacquer pb-12 pt-12 text-oxblood sm:pt-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 id="services-title" className="font-display text-[clamp(2.6rem,8vw,4.25rem)] font-medium leading-none">
            The menu
          </h2>
          <p className="mt-4 text-lg">Choose a mirror to see its services and prices, then book the one you want.</p>
          <div className="relative mx-auto mt-6 max-w-md">
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
            <label htmlFor="service-search" className="sr-only">
              Search services
            </label>
            <input
              id="service-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the menu: lami, tint, wax"
              className="field rounded-full border-oxblood py-3 pl-11 pr-11"
              autoComplete="off"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-plaster">
                <IconX size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="relative mx-auto mt-10 max-w-7xl">
          <div
            ref={trackRef}
            onScroll={onTrackScroll}
            role="tablist"
            aria-label="Service categories"
            className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-3 pt-2 sm:scroll-px-6 sm:gap-6 sm:px-6"
          >
            {groups.map((g, i) => {
              const on = !query && current?.id === g.id;
              const label = categoryLabel(g.name);
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  id={`cat-tab-${g.id}`}
                  data-cat-card={g.id}
                  aria-selected={on}
                  aria-controls="menu-panel"
                  tabIndex={on || (query && i === 0) ? 0 : -1}
                  onClick={() => select(g.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className="group w-[40%] shrink-0 snap-start rounded-3xl pb-1 text-center sm:w-[27%] md:w-[21%] lg:w-[calc((100%-7.5rem)/6)]"
                >
                  <span
                    className={`mirror block aspect-[3/4] transition duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-1 ${
                      on ? "shadow-[0_0_0_2px_var(--color-brass),0_0_0_6px_var(--color-rose),0_0_0_7.5px_var(--color-oxblood),0_26px_40px_-20px_rgba(58,15,28,0.7)]" : ""
                    }`}
                  >
                    {g.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.imageUrl} alt="" loading={i < 4 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-[radial-gradient(80%_60%_at_35%_25%,#fbe4eb,#eeb0c4_70%,#e597b1)]">
                        <span className="font-display text-[clamp(2.6rem,9vw,3.6rem)] font-medium text-oxblood">{label.slice(0, 1)}</span>
                      </span>
                    )}
                    {on && <span key={sheen} aria-hidden="true" className="mirror-sheen animate-sheen" />}
                  </span>
                  <span className={`font-display mt-4 block text-[1.2rem] font-medium leading-tight sm:text-[1.3rem] ${on ? "underline decoration-1 underline-offset-[0.3em]" : ""}`}>{label}</span>
                  <span className="mt-1.5 block text-[0.72rem] font-medium uppercase tracking-[0.14em]">
                    {g.fromCents ? `From ${priceLabel(g.fromCents)}` : "Free consultation"}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={edges.start}
            aria-label="Previous categories"
            className="absolute left-2 top-[36%] hidden size-11 place-items-center rounded-full bg-panel text-oxblood shadow-[0_8px_20px_-10px_rgba(58,15,28,0.6)] transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 lg:grid"
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            disabled={edges.end}
            aria-label="More categories"
            className="absolute right-2 top-[36%] hidden size-11 place-items-center rounded-full bg-panel text-oxblood shadow-[0_8px_20px_-10px_rgba(58,15,28,0.6)] transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 lg:grid"
          >
            <IconChevronRight />
          </button>
        </div>
      </div>

      {/* Compact category bar while reading a long list */}
      <div
        className={`sticky top-16 z-20 border-b border-line bg-plaster/95 transition duration-300 ${miniNav && !query ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}
        aria-hidden={!miniNav || !!query}
      >
        <div className="no-scrollbar mx-auto flex max-w-4xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              tabIndex={miniNav ? 0 : -1}
              onClick={() => select(g.id, { scroll: "panel" })}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[0.78rem] font-medium uppercase tracking-[0.12em] transition ${
                current?.id === g.id ? "bg-oxblood text-plaster" : "ring-1 ring-line-strong hover:ring-lacquer"
              }`}
            >
              {categoryLabel(g.name)}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={panelRef}
        id="menu-panel"
        role="tabpanel"
        aria-labelledby={!query && current ? `cat-tab-${current.id}` : undefined}
        aria-label={query ? "Search results" : undefined}
        className="mx-auto max-w-4xl scroll-mt-32 px-4 pb-20 pt-12 sm:px-6 sm:pb-28"
      >
        <p className="sr-only" aria-live="polite">
          {query ? `${results.reduce((n, g) => n + g.services.length, 0)} services match “${q}”` : ""}
        </p>
        {query ? (
          results.length === 0 ? (
            <div className="mx-auto max-w-md animate-rise text-center">
              <p className="font-display text-2xl font-medium">No services match “{q}”</p>
              <p className="mt-2 text-ink-soft">Try another word, or choose a mirror above.</p>
              <button type="button" className="btn-primary mt-6" onClick={() => setQ("")}>
                Show all services
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {results.map((g) => (
                <div key={g.id} className="animate-rise">
                  <h3 className="font-display text-[1.75rem] font-medium leading-tight">{categoryLabel(g.name)}</h3>
                  <ServiceList group={g} popular={popular} onDetails={setDetails} onBook={onBook} />
                </div>
              ))}
            </div>
          )
        ) : (
          current && (
            <div key={current.id} className="animate-rise">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-oxblood pb-4">
                <div>
                  <h3 className="font-display text-[clamp(2rem,6vw,2.75rem)] font-medium leading-none">{categoryLabel(current.name)}</h3>
                  <p className="mt-2 text-sm text-ink-soft">
                    {current.description || `${current.services.length} service${current.services.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                {groups.length > 1 && nextGroup && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[0.78rem] font-medium uppercase tracking-[0.14em] text-lacquer underline-offset-[0.4em] hover:underline"
                    onClick={() => select(nextGroup.id, { scroll: "panel" })}
                  >
                    Next: {categoryLabel(nextGroup.name)} <IconChevronRight size={14} />
                  </button>
                )}
              </div>
              <ServiceList group={current} popular={popular} onDetails={setDetails} onBook={onBook} />
            </div>
          )
        )}
      </div>

      <ServiceSheet data={data} service={details} popular={!!details && popular.has(details.id)} onClose={() => setDetails(null)} onBook={onBook} />
    </section>
  );
}

function ServiceList({ group, popular, onDetails, onBook }: { group: Group; popular: Set<number>; onDetails: (s: PublicService) => void; onBook: (s: PublicService) => void }) {
  return (
    <ul className="divide-y divide-line">
      {group.services.map((s) => (
        <ServiceRow key={s.id} service={s} popular={popular.has(s.id)} onDetails={() => onDetails(s)} onBook={() => onBook(s)} />
      ))}
    </ul>
  );
}

function ServiceRow({ service: s, popular, onDetails, onBook }: { service: PublicService; popular: boolean; onDetails: () => void; onBook: () => void }) {
  const name = prettyName(s.name);
  const firstLine = s.description.split("\n").find((l) => l.trim()) ?? "";
  return (
    <li className="group relative flex items-center gap-4 py-5 sm:gap-6 sm:py-6">
      <button
        type="button"
        onClick={onDetails}
        aria-haspopup="dialog"
        aria-label={`${name}, details`}
        className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-lacquer"
      >
        <span className="flex items-baseline gap-3">
          <span className="text-[1.08rem] font-medium leading-snug sm:text-[1.15rem]">{name}</span>
          {popular && <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-lacquer ring-1 ring-lacquer">Popular</span>}
          <span aria-hidden="true" className="hidden min-w-8 flex-1 translate-y-[-0.3em] border-b border-dotted border-line-strong sm:block" />
        </span>
        <span className="mt-1 block text-sm text-ink-soft">
          {shortDuration(s.durationMin)}
          <span className="ml-2 font-medium text-lacquer group-hover:underline">Details</span>
        </span>
        {firstLine && <span className="mt-1 hidden text-sm text-ink-soft sm:line-clamp-1">{firstLine}</span>}
      </button>
      <div className="relative z-10 flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-5">
        <span className="font-display text-[1.55rem] font-medium leading-none tabular-nums">{priceLabel(s.priceCents)}</span>
        <button type="button" className="btn-primary min-h-0 px-5 py-2.5" onClick={onBook} aria-label={`Book ${name}`}>
          Book
        </button>
      </div>
    </li>
  );
}
