"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import type { PublicData, PublicService, Slot } from "./types";
import { prettyName, priceLabel, shortDuration } from "@/lib/display";
import { money } from "@/lib/format";
import { IconArrowRight, IconCheck, IconChevronDown, IconClock, IconPin } from "@/components/landing/icons";

// ---------------------------------------------------------------------------
// Stepper

export type StepDef = { key: string; label: string; onGo?: () => void };

export function Stepper({ steps, current }: { steps: StepDef[]; current: number }) {
  return (
    <nav aria-label="Booking progress">
      <ol className="flex items-center gap-1.5 sm:gap-3">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const dot = (
            <span
              className={`font-display grid size-8 shrink-0 place-items-center rounded-full text-[0.95rem] font-medium transition ${
                done ? "bg-oxblood text-plaster" : active ? "bg-rose text-oxblood ring-1 ring-oxblood ring-offset-2 ring-offset-plaster" : "text-ink-soft ring-1 ring-line-strong"
              }`}
            >
              {done ? <IconCheck size={14} strokeWidth={2.6} /> : i + 1}
            </span>
          );
          const label = <span className={`text-[0.78rem] font-medium uppercase tracking-[0.14em] ${active ? "" : "hidden text-ink-soft sm:inline"}`}>{s.label}</span>;
          return (
            <li key={s.key} className={`flex min-w-0 items-center gap-1.5 sm:gap-3 ${i < steps.length - 1 ? "flex-1" : ""}`} aria-current={active ? "step" : undefined}>
              {done && s.onGo ? (
                <button type="button" onClick={s.onGo} className="flex items-center gap-2 rounded-full pr-1 hover:opacity-80" aria-label={`Back to ${s.label}`}>
                  {dot}
                  {label}
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  {dot}
                  {label}
                  {!active && <span className="sr-only">{done ? "(done)" : "(next)"}</span>}
                </span>
              )}
              {i < steps.length - 1 && <span aria-hidden="true" className={`h-px flex-1 ${done ? "bg-oxblood" : "bg-line-strong/50"}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Summary

export type SummaryProps = {
  data: PublicData;
  service: PublicService;
  location: number | "any";
  addons: PublicData["addons"];
  slot: Slot | null;
};

export function computeTotals({ service, addons }: Pick<SummaryProps, "service" | "addons">) {
  const totalPrice = service.priceCents + addons.reduce((n, a) => n + a.priceCents, 0);
  const totalMin = service.durationMin + addons.reduce((n, a) => n + a.durationMin, 0);
  const deposit = Math.min(service.depositCents, totalPrice);
  return { totalPrice, totalMin, deposit };
}

export function locationLabel(data: PublicData, location: number | "any", slot?: Slot | null) {
  if (location !== "any") {
    const l = data.locations.find((x) => x.id === location);
    return l?.city ?? l?.name ?? "";
  }
  if (slot && slot.locationIds.length === 1) {
    const l = data.locations.find((x) => x.id === slot.locationIds[0]);
    return l?.city ?? l?.name ?? "Any studio";
  }
  return "Any available studio";
}

export function slotLabel(slot: Slot, zone: string) {
  return DateTime.fromISO(slot.start).setZone(zone).toFormat("ccc, LLL d · h:mm a");
}

export function Summary({ data, service, location, addons, slot, action }: SummaryProps & { action?: React.ReactNode }) {
  const { totalPrice, totalMin, deposit } = computeTotals({ service, addons });
  return (
    <div className="rounded-[1.75rem] bg-panel p-1.5 shadow-[0_24px_48px_-28px_rgba(58,15,28,0.55)]">
    <div className="rounded-[1.4rem] p-6 ring-1 ring-brass">
      <h2 className="font-display text-[1.5rem] font-medium leading-tight">Your appointment</h2>
      <p className="mt-1 font-medium leading-snug">{prettyName(service.name)}</p>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-center gap-2 text-ink-soft">
          <IconClock size={16} className="shrink-0 text-lacquer" /> {shortDuration(totalMin)}
        </li>
        <li className="flex items-center gap-2 text-ink-soft">
          <IconPin size={16} className="shrink-0 text-lacquer" /> {locationLabel(data, location, slot)}
        </li>
        <li className={`flex items-center gap-2 ${slot ? "font-medium" : "text-ink-soft"}`}>
          <span className="grid size-4 shrink-0 place-items-center text-lacquer">
            <IconArrowRight size={16} />
          </span>
          {slot ? slotLabel(slot, data.timezone) : "Pick a date & time"}
        </li>
      </ul>
      <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt>{prettyName(service.name)}</dt>
          <dd>{money(service.priceCents)}</dd>
        </div>
        {addons.map((a) => (
          <div key={a.id} className="flex justify-between gap-3 text-ink-soft">
            <dt>+ {a.name}</dt>
            <dd>{money(a.priceCents)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 pt-3">
          <dt className="font-medium">Total</dt>
          <dd className="font-display text-[1.6rem] font-medium leading-none tabular-nums">{money(totalPrice)}</dd>
        </div>
      </dl>
      {deposit > 0 ? (
        <div className="mt-4 rounded-2xl bg-plaster px-4 py-3 text-sm">
          {data.onlineDeposit ? (
            <>
              <p className="flex justify-between font-medium">
                <span>Due today</span> <span>{money(deposit)}</span>
              </p>
              <p className="mt-0.5 flex justify-between text-ink-soft">
                <span>At your appointment</span> <span>{money(totalPrice - deposit)}</span>
              </p>
            </>
          ) : (
            <p>
              <strong>{priceLabel(deposit)} deposit</strong> due within 24 hours to hold your spot; the rest at your appointment.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-plaster px-4 py-3 text-sm">No deposit needed for this one.</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
    </div>
  );
}

/** Compact, expandable version for phones. */
export function MobileSummary(props: SummaryProps) {
  const [open, setOpen] = useState(false);
  const { totalPrice } = computeTotals(props);
  return (
    <div className="mt-4 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-panel px-4 py-3 text-left ring-1 ring-line"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{prettyName(props.service.name)}</span>
          <span className="block truncate text-sm text-ink-soft">
            {props.slot ? slotLabel(props.slot, props.data.timezone) : locationLabel(props.data, props.location)} · {money(totalPrice)}
          </span>
        </span>
        <IconChevronDown className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2">
          <Summary {...props} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Location

export function LocationStep({ data, service, onPick }: { data: PublicData; service: PublicService; onPick: (loc: number | "any") => void }) {
  const locs = data.locations.filter((l) => service.locationIds.includes(l.id));
  const options = [
    { id: "any" as const, title: "Any available", sub: "See every open time at both studios", badge: "Most openings" },
    ...locs.map((l) => ({ id: l.id, title: l.city ?? l.name, sub: l.name, badge: "" })),
  ];
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {options.map((o, i) => (
        <li key={o.id} className={`animate-rise ${o.id === "any" ? "sm:col-span-2" : ""}`} style={{ animationDelay: `${120 + i * 90}ms` }}>
          <button
            type="button"
            onClick={() => onPick(o.id)}
            aria-label={`Select ${o.title}`}
            className={`group flex w-full items-center justify-between gap-4 rounded-[1.5rem] p-5 text-left transition duration-200 sm:p-6 ${
              o.id === "any" ? "bg-oxblood text-plaster hover:bg-oxblood-2" : "bg-panel ring-1 ring-line hover:ring-lacquer"
            }`}
          >
            <span>
              <span className="font-display flex flex-wrap items-center gap-x-3 gap-y-1 text-[1.6rem] font-medium leading-tight">
                {o.title}
                {o.badge && <span className="font-sans rounded-full px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-brass-light ring-1 ring-brass-light/70">{o.badge}</span>}
              </span>
              <span className={`mt-1 block text-sm ${o.id === "any" ? "text-plaster" : "text-ink-soft"}`}>{o.sub}</span>
            </span>
            <IconArrowRight className={`shrink-0 transition group-hover:translate-x-1 ${o.id === "any" ? "text-brass-light" : "text-lacquer"}`} />
          </button>
        </li>
      ))}
      <li className="text-center text-sm text-ink-soft sm:col-span-2">{data.locationNote}</li>
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Add-ons

export function AddonPicker({ addons, selected, onToggle }: { addons: PublicData["addons"]; selected: number[]; onToggle: (id: number, on: boolean) => void }) {
  // Collapsed on phones so the calendar stays close; open by default on larger screens.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) setOpen(true);
  }, []);
  const chosen = addons.filter((a) => selected.includes(a.id));
  if (!addons.length) return null;
  return (
    <fieldset className="mt-6">
      <legend className="sr-only">Add something extra (optional)</legend>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="addon-list"
        className="flex w-full items-center justify-between gap-3 rounded-2xl text-left"
      >
        <span>
          <span className="font-display text-[1.6rem] font-medium">Add something extra?</span> <span className="text-sm text-ink-soft">Optional · {addons.length} options</span>
          {!open && chosen.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {chosen.map((a) => (
                <span key={a.id} className="rounded-full bg-oxblood px-3 py-1 text-xs text-plaster">
                  + {a.name}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-panel ring-1 ring-line-strong">
          <IconChevronDown className={`transition ${open ? "rotate-180" : ""}`} size={18} />
        </span>
      </button>
      <div id="addon-list" className={`mt-3 gap-2.5 sm:grid-cols-2 ${open ? "grid" : "hidden"}`}>
        {addons.map((a) => {
          const on = selected.includes(a.id);
          return (
            <label
              key={a.id}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lacquer ${
                on ? "bg-oxblood text-plaster shadow-[0_10px_28px_-14px_rgba(58,15,28,0.7)]" : "bg-panel ring-1 ring-line hover:ring-lacquer"
              }`}
            >
              <input type="checkbox" className="sr-only" checked={on} onChange={(e) => onToggle(a.id, e.target.checked)} />
              <span className={`grid size-6 shrink-0 place-items-center rounded-full ${on ? "bg-rose text-oxblood" : "ring-1 ring-line-strong"}`}>{on && <IconCheck size={14} strokeWidth={2.6} />}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-tight">{a.name}</span>
                <span className={`text-sm ${on ? "text-plaster" : "text-ink-soft"}`}>+ {shortDuration(a.durationMin)}</span>
              </span>
              <span className="font-display text-lg font-medium tabular-nums">+{priceLabel(a.priceCents)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
