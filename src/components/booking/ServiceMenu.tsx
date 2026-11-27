"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicData, PublicService } from "./types";
import ServiceSheet from "./ServiceSheet";
import { categoryLabel, prettyName, priceLabel, shortDuration } from "@/lib/display";
import { IconChevronRight, IconSearch, IconX } from "@/components/landing/icons";

type Group = PublicData["categories"][number] & {
  services: PublicService[];
  fromCents: number;
  hasFree: boolean;
};

/**
 * "Our services": each category is a rounded photo card with its name on a
 * wine pill across the bottom edge (the owner's photo, or a monogram on
 * blush). The cards act as tabs: choosing one sends a light sheen across its
 * photo and lists that category's services below. Search covers everything.
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
  const query = q.trim().toLowerCase();
  const popular = useMemo(() => new Set(data.popularIds), [data.popularIds]);

  const groups: Group[] = useMemo(
    () =>
      data.categories
        .map((c) => {
          const services = data.services.filter((s) => s.categoryId === c.id);
          const paid = services.map((s) => s.priceCents).filter((p) => p > 0);
          return {
            ...c,
            services,
            fromCents: paid.length ? Math.min(...paid) : 0,
            hasFree: services.some((s) => s.priceCents === 0),
          };
        })
        .filter((g) => g.services.length),
    [data],
  );
  const results = useMemo(() => {
    if (!query) return [];
    return groups
      .map((g) => ({
        ...g,
        services: g.services.filter((s) => `${s.name} ${s.description} ${s.categoryName}`.toLowerCase().includes(query)),
      }))
      .filter((g) => g.services.length);
  }, [groups, query]);
  const current = groups.find((g) => g.id === selected) ?? groups[0];
  const nextGroup = current ? groups[(groups.findIndex((g) => g.id === current.id) + 1) % groups.length] : null;

  const select = useCallback((id: number, opts: { scroll?: "panel" | "auto" } = {}) => {
    setSelected(id);
    setSheen((n) => n + 1);
    setQ("");
    const card = trackRef.current?.querySelector<HTMLElement>(`[data-cat-card="${id}"]`);
    if (card && trackRef.current) {
      const t = trackRef.current;
      t.scrollTo({
        left: card.offsetLeft - (t.clientWidth - card.clientWidth) / 2,
        behavior: "smooth",
      });
    }
    const panel = panelRef.current;
    const offscreen = !!panel && panel.getBoundingClientRect().top > window.innerHeight * 0.7;
    if (opts.scroll === "panel" || (opts.scroll === "auto" && offscreen)) requestAnimationFrame(() => panel?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  // Links to #cat-<id> open that category: open that category and bring its list into view.
  useEffect(() => {
    const fromHash = () => {
      const m = /^#cat-(\d+)$/.exec(window.location.hash);
      if (m && groups.some((g) => g.id === Number(m[1]))) select(Number(m[1]), { scroll: "panel" });
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [groups, select]);

  // Compact category bar once the category cards have scrolled away.
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
      <div ref={wallRef} className="px-4 pt-14 sm:px-8 sm:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="services-title" className="heading text-[clamp(2.75rem,9vw,4.75rem)] text-oxblood">
            Our services
          </h2>
          <p className="mt-4 text-lg text-ink-soft">Choose a category to see its services and prices, then book the one you want.</p>
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
              className="field rounded-full py-3 pl-11 pr-11"
              autoComplete="off"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-plaster"
              >
                <IconX size={16} />
              </button>
            )}
          </div>
        </div>

        <div
          ref={trackRef}
          role="tablist"
          aria-label="Service categories"
          className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 pt-2 sm:mx-auto sm:grid sm:max-w-5xl sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:gap-x-8"
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
                onClick={() => select(g.id, { scroll: "auto" })}
                onKeyDown={(e) => onTabKey(e, i)}
                className="group w-[58%] shrink-0 snap-start rounded-[1.6rem] text-center sm:w-auto"
              >
                <span className="relative block">
                  <span
                    className={`photo-frame block aspect-[4/5] rounded-[1.4rem] transition duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-1 sm:aspect-square lg:aspect-[5/4] ${
                      on ? "ring-2 ring-lacquer ring-offset-4 ring-offset-panel" : ""
                    }`}
                  >
                    {g.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.imageUrl} alt="" loading={i < 3 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-plaster">
                        <span className="heading text-[clamp(3rem,10vw,4.5rem)] text-lacquer">{label.slice(0, 1)}</span>
                      </span>
                    )}
                    {on && <span key={sheen} aria-hidden="true" className="sheen animate-sheen" />}
                  </span>
                  {/* The label pill sits across the bottom edge of the photo */}
                  <span
                    className={`heading absolute inset-x-0 bottom-0 mx-auto w-fit max-w-[calc(100%-1.25rem)] translate-y-1/2 text-balance rounded-full px-5 py-2.5 text-[0.95rem] tracking-[0.06em] shadow-[0_10px_20px_-12px_rgba(58,15,28,0.7)] transition duration-300 sm:text-[1.02rem] ${
                      on ? "bg-rose text-oxblood" : "bg-oxblood text-panel group-hover:bg-oxblood-2"
                    }`}
                  >
                    {label}
                  </span>
                </span>
                <span className="mt-9 block px-2 text-[0.72rem] font-medium uppercase leading-relaxed tracking-[0.14em] text-ink-soft">
                  <span className="line-clamp-2">{g.description || `${g.services.length} service${g.services.length === 1 ? "" : "s"}`}</span>
                  <span className="mt-1 block text-lacquer">{g.fromCents ? `From ${priceLabel(g.fromCents)}` : "Free consultation"}</span>
                </span>
              </button>
            );
          })}
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
        className="mx-auto max-w-4xl scroll-mt-32 px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-14"
      >
        <p className="sr-only" aria-live="polite">
          {query ? `${results.reduce((n, g) => n + g.services.length, 0)} services match “${q}”` : ""}
        </p>
        {query ? (
          results.length === 0 ? (
            <div className="mx-auto max-w-md animate-rise text-center">
              <p className="heading text-[1.75rem] text-oxblood">No services match “{q}”</p>
              <p className="mt-2 text-ink-soft">Try another word, or choose a category above.</p>
              <button type="button" className="btn-primary mt-6" onClick={() => setQ("")}>
                Show all services
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {results.map((g) => (
                <div key={g.id} className="animate-rise">
                  <h3 className="heading text-[1.9rem] text-oxblood">{categoryLabel(g.name)}</h3>
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
                  <h3 className="heading text-[clamp(2.1rem,6vw,2.9rem)] text-oxblood">{categoryLabel(current.name)}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{current.description || `${current.services.length} service${current.services.length === 1 ? "" : "s"}`}</p>
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
