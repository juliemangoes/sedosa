"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicData, PublicService } from "./types";
import ServiceSheet from "./ServiceSheet";
import { categoryLabel, prettyName, priceLabel, shortDuration } from "@/lib/display";
import CategoryIcon from "@/components/landing/CategoryIcon";
import { IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconSearch, IconX, Sparkle } from "@/components/landing/icons";

type Group = PublicData["categories"][number] & { services: PublicService[]; fromCents: number; hasFree: boolean };

/**
 * The service menu: a swipeable carousel of category cards (with the studio's
 * photos) acting as tabs, the chosen category's services as a price list, a
 * compact category bar once the carousel scrolls away, search across
 * everything, and a details sheet per service.
 */
export default function ServiceMenu({ data, onBook }: { data: PublicData; onBook: (s: PublicService) => void }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(data.categories[0]?.id ?? null);
  const [details, setDetails] = useState<PublicService | null>(null);
  const [miniNav, setMiniNav] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
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

  const select = useCallback(
    (id: number, opts: { scroll?: "panel" | "card" } = {}) => {
      setSelected(id);
      setQ("");
      const card = trackRef.current?.querySelector<HTMLElement>(`[data-cat-card="${id}"]`);
      if (card && trackRef.current) {
        const t = trackRef.current;
        t.scrollTo({ left: card.offsetLeft - (t.clientWidth - card.clientWidth) / 2, behavior: "smooth" });
      }
      if (opts.scroll === "panel") requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    },
    [],
  );

  // Hero shortcuts link to #cat-<id>: open that category and bring the list into view.
  useEffect(() => {
    const fromHash = () => {
      const m = /^#cat-(\d+)$/.exec(window.location.hash);
      if (m && groups.some((g) => g.id === Number(m[1]))) select(Number(m[1]), { scroll: "panel" });
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [groups, select]);

  // Compact category bar once the carousel is scrolled out of view.
  useEffect(() => {
    const el = carouselRef.current;
    const panel = panelRef.current;
    if (!el || !panel) return;
    let carouselGone = false;
    let panelVisible = false;
    const update = () => setMiniNav(carouselGone && panelVisible);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === el) carouselGone = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === panel) panelVisible = e.isIntersecting;
      }
      update();
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
    <section id="services" aria-labelledby="services-title" className="scroll-mt-16 pb-16 pt-10 sm:pb-24 sm:pt-14">
      <div data-reveal className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <p className="kicker text-sm text-plum">The menu</p>
        <h2 id="services-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Choose your service
        </h2>
        <p className="mt-3 text-lg text-ink/75">Swipe through the categories, tap a service for details, or Book to see open times.</p>
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

      {/* Category carousel */}
      <div ref={carouselRef} data-reveal className="relative mx-auto mt-8 max-w-6xl">
        <div
          ref={trackRef}
          onScroll={onTrackScroll}
          role="tablist"
          aria-label="Service categories"
          className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 pt-1 sm:scroll-px-6 sm:px-6"
        >
          {groups.map((g, i) => {
            const on = !query && current?.id === g.id;
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
                className={`group relative aspect-[4/5] w-[72%] shrink-0 snap-start overflow-hidden rounded-[1.75rem] text-left transition duration-300 sm:w-[42%] md:w-[31%] lg:w-[calc((100%-3rem)/4)] ${
                  on ? "shadow-[0_22px_50px_-20px_rgba(109,43,103,0.75)] ring-[3px] ring-neon ring-offset-2 ring-offset-blush" : "shadow-[0_16px_40px_-24px_rgba(0,0,0,0.6)] hover:-translate-y-1"
                }`}
              >
                {g.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.imageUrl} alt="" loading={i < 3 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
                ) : (
                  <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_10%,#5a1f50_0%,#1a1018_55%,#0b0709_100%)]">
                    <span className="absolute right-[12%] top-[14%] text-neon opacity-90 drop-shadow-[0_0_18px_rgba(255,92,191,0.8)] transition duration-500 group-hover:scale-110">
                      <CategoryIcon name={g.name} size={72} />
                    </span>
                    <Sparkle className="absolute left-[14%] top-[22%] animate-twinkle text-white/80" size={14} />
                    <Sparkle className="absolute right-[38%] top-[48%] animate-twinkle text-neon-soft [animation-delay:1.1s]" size={10} />
                  </span>
                )}
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                {on && (
                  <span aria-hidden="true" className="absolute right-3 top-3 grid size-8 animate-pop place-items-center rounded-full bg-neon text-black shadow-lg">
                    <IconCheck size={16} strokeWidth={2.6} />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <span className="flex items-center gap-2 text-neon-soft">
                    <CategoryIcon name={g.name} size={16} />
                    <span className="kicker text-[0.7rem]">
                      {g.services.length} service{g.services.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-[1.45rem] font-semibold leading-tight">{categoryLabel(g.name)}</span>
                  {g.description && <span className="mt-1 line-clamp-2 block text-sm text-white/80">{g.description}</span>}
                  <span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                    {g.fromCents ? `From ${priceLabel(g.fromCents)}` : "Free consultation"}
                  </span>
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
          className="absolute -left-3 top-[42%] hidden size-12 place-items-center rounded-full bg-white shadow-lg ring-1 ring-petal-line transition hover:scale-105 disabled:pointer-events-none disabled:opacity-0 lg:grid"
        >
          <IconChevronLeft />
        </button>
        <button
          type="button"
          onClick={() => page(1)}
          disabled={edges.end}
          aria-label="More categories"
          className="absolute -right-3 top-[42%] hidden size-12 place-items-center rounded-full bg-white shadow-lg ring-1 ring-petal-line transition hover:scale-105 disabled:pointer-events-none disabled:opacity-0 lg:grid"
        >
          <IconChevronRight />
        </button>
        <div aria-hidden="true" className="mt-1 flex justify-center gap-1.5 lg:hidden">
          {groups.map((g) => (
            <span key={g.id} className={`h-1.5 rounded-full transition-all duration-300 ${!query && current?.id === g.id ? "w-6 bg-plum" : "w-1.5 bg-plum/25"}`} />
          ))}
        </div>
      </div>

      {/* Compact category bar while browsing a long list */}
      <div
        className={`sticky top-16 z-20 border-y border-petal-line/70 bg-blush/90 backdrop-blur-md transition duration-300 ${miniNav && !query ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}
        aria-hidden={!miniNav || !!query}
      >
        <div className="no-scrollbar mx-auto flex max-w-4xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              tabIndex={miniNav ? 0 : -1}
              onClick={() => select(g.id, { scroll: "panel" })}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                current?.id === g.id ? "bg-black text-white" : "bg-white/80 ring-1 ring-petal-line hover:ring-plum"
              }`}
            >
              <CategoryIcon name={g.name} size={15} className={current?.id === g.id ? "text-neon" : "text-plum"} />
              {categoryLabel(g.name)}
            </button>
          ))}
        </div>
      </div>

      <div ref={panelRef} id="menu-panel" role="tabpanel" aria-labelledby={!query && current ? `cat-tab-${current.id}` : undefined} aria-label={query ? "Search results" : undefined} className="mx-auto -mt-px max-w-4xl scroll-mt-32 px-4 pt-6 sm:px-6">
        <p className="sr-only" aria-live="polite">
          {query ? `${results.reduce((n, g) => n + g.services.length, 0)} services match “${q}”` : ""}
        </p>
        {query ? (
          results.length === 0 ? (
            <div className="mx-auto max-w-md animate-rise rounded-3xl bg-white/70 p-8 text-center ring-1 ring-petal-line">
              <p className="text-lg font-semibold">No services match “{q}”</p>
              <p className="mt-1 text-ink/70">Try another word, or browse the categories.</p>
              <button type="button" className="btn-black mt-5" onClick={() => setQ("")}>
                Show all services
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {results.map((g) => (
                <div key={g.id} className="animate-rise">
                  <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                    <CategoryIcon name={g.name} size={20} className="text-plum" /> {categoryLabel(g.name)}
                  </h3>
                  <ServiceList group={g} popular={popular} onDetails={setDetails} onBook={onBook} />
                </div>
              ))}
            </div>
          )
        ) : (
          current && (
            <div key={current.id} className="animate-rise">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-2xl font-semibold leading-tight">{categoryLabel(current.name)}</h3>
                  <p className="text-sm text-ink/70">
                    {current.services.length} service{current.services.length === 1 ? "" : "s"}
                    {current.fromCents > 0 && ` · from ${priceLabel(current.fromCents)}`}
                    {current.hasFree && " · free consultation"}
                  </p>
                </div>
                {groups.length > 1 && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-plum underline-offset-4 hover:underline"
                    onClick={() => {
                      const i = groups.findIndex((g) => g.id === current.id);
                      select(groups[(i + 1) % groups.length].id, { scroll: "panel" });
                    }}
                  >
                    Next: {categoryLabel(groups[(groups.findIndex((g) => g.id === current.id) + 1) % groups.length].name)} <IconChevronRight size={14} />
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
    <ul className="divide-y divide-petal-line/70 overflow-hidden rounded-3xl bg-white/80 ring-1 ring-petal-line">
      {group.services.map((s, i) => (
        <ServiceRow key={s.id} index={i} service={s} popular={popular.has(s.id)} onDetails={() => onDetails(s)} onBook={() => onBook(s)} />
      ))}
    </ul>
  );
}

function ServiceRow({ service: s, index, popular, onDetails, onBook }: { service: PublicService; index: number; popular: boolean; onDetails: () => void; onBook: () => void }) {
  const name = prettyName(s.name);
  const firstLine = s.description.split("\n").find((l) => l.trim()) ?? "";
  return (
    <li className="group relative flex animate-rise items-center gap-3 p-4 transition-colors duration-200 hover:bg-white sm:gap-5 sm:px-6 sm:py-5" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
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
