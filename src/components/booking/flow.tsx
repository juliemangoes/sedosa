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
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition ${
                done ? "bg-plum text-white" : active ? "bg-black text-white ring-4 ring-neon/30" : "bg-white text-ink/70 ring-1 ring-petal-line"
              }`}
            >
              {done ? <IconCheck size={14} strokeWidth={2.6} /> : i + 1}
            </span>
          );
          const label = <span className={`text-sm ${active ? "font-semibold" : "text-ink/70"} ${active ? "" : "hidden sm:inline"}`}>{s.label}</span>;
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
              {i < steps.length - 1 && <span aria-hidden="true" className={`h-px flex-1 ${done ? "bg-plum" : "bg-petal-line"}`} />}
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
    <div className="rounded-3xl bg-white/80 p-6 shadow-[0_20px_50px_-30px_rgba(109,43,103,0.5)] ring-1 ring-petal-line">
      <p className="kicker text-xs text-plum">Your appointment</p>
      <p className="mt-2 text-lg font-semibold leading-snug">{prettyName(service.name)}</p>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-center gap-2 text-ink/75">
          <IconClock size={16} className="shrink-0 text-plum" /> {shortDuration(totalMin)}
        </li>
        <li className="flex items-center gap-2 text-ink/75">
          <IconPin size={16} className="shrink-0 text-plum" /> {locationLabel(data, location, slot)}
        </li>
        <li className={`flex items-center gap-2 ${slot ? "font-semibold" : "text-ink/70"}`}>
          <span className="grid size-4 shrink-0 place-items-center text-plum">
            <IconArrowRight size={16} />
          </span>
          {slot ? slotLabel(slot, data.timezone) : "Pick a date & time"}
        </li>
      </ul>
      <dl className="mt-5 space-y-1.5 border-t border-petal-line pt-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt>{prettyName(service.name)}</dt>
          <dd>{money(service.priceCents)}</dd>
        </div>
        {addons.map((a) => (
          <div key={a.id} className="flex justify-between gap-3 text-ink/75">
            <dt>+ {a.name}</dt>
            <dd>{money(a.priceCents)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd>{money(totalPrice)}</dd>
        </div>
      </dl>
      {deposit > 0 ? (
        <div className="mt-4 rounded-2xl bg-blush px-4 py-3 text-sm">
          {data.onlineDeposit ? (
            <>
              <p className="flex justify-between font-semibold">
                <span>Due today</span> <span>{money(deposit)}</span>
              </p>
              <p className="mt-0.5 flex justify-between text-ink/70">
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
        <p className="mt-4 rounded-2xl bg-blush px-4 py-3 text-sm">No deposit needed for this one ♡</p>
      )}
      {action && <div className="mt-5">{action}</div>}
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
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3 text-left ring-1 ring-petal-line"
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold">{prettyName(props.service.name)}</span>
          <span className="block truncate text-sm text-ink/70">
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
      {options.map((o) => (
        <li key={o.id} className={o.id === "any" ? "sm:col-span-2" : ""}>
          <button
            type="button"
            onClick={() => onPick(o.id)}
            aria-label={`Select ${o.title}`}
            className="group flex w-full items-center justify-between gap-4 rounded-3xl bg-white/80 p-5 text-left ring-1 ring-petal-line transition hover:bg-white hover:ring-2 hover:ring-plum"
          >
            <span className="flex items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-black text-neon">
                <IconPin size={20} />
              </span>
              <span>
                <span className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                  {o.title}
                  {o.badge && <span className="rounded-full bg-neon/20 px-2.5 py-0.5 text-xs font-medium text-plum">{o.badge}</span>}
                </span>
                <span className="block text-sm text-ink/70">{o.sub}</span>
              </span>
            </span>
            <IconArrowRight className="shrink-0 text-plum transition group-hover:translate-x-1" />
          </button>
        </li>
      ))}
      <li className="text-center text-sm text-ink/70 sm:col-span-2">{data.locationNote}</li>
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
          <span className="text-lg font-semibold">Add something extra?</span> <span className="text-sm text-ink/70">Optional · {addons.length} options</span>
          {!open && chosen.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {chosen.map((a) => (
                <span key={a.id} className="rounded-full bg-black px-3 py-1 text-xs text-white">
                  + {a.name}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white ring-1 ring-petal-line">
          <IconChevronDown className={`transition ${open ? "rotate-180" : ""}`} size={18} />
        </span>
      </button>
      <div id="addon-list" className={`mt-3 gap-2.5 sm:grid-cols-2 ${open ? "grid" : "hidden"}`}>
        {addons.map((a) => {
          const on = selected.includes(a.id);
          return (
            <label
              key={a.id}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-plum ${
                on ? "bg-black text-white" : "bg-white/80 ring-1 ring-petal-line hover:ring-plum"
              }`}
            >
              <input type="checkbox" className="sr-only" checked={on} onChange={(e) => onToggle(a.id, e.target.checked)} />
              <span className={`grid size-6 shrink-0 place-items-center rounded-full ${on ? "bg-neon text-black" : "ring-1 ring-ink/25"}`}>{on && <IconCheck size={14} strokeWidth={2.6} />}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-tight">{a.name}</span>
                <span className={`text-sm ${on ? "text-white/70" : "text-ink/70"}`}>+ {shortDuration(a.durationMin)}</span>
              </span>
              <span className="font-semibold">+{priceLabel(a.priceCents)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
