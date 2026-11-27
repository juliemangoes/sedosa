"use client";

import { useEffect, useRef } from "react";
import type { PublicData, PublicService } from "./types";
import { categoryLabel, placesLabel, prettyName, priceLabel, shortDuration } from "@/lib/display";
import { guidesFor } from "@/content/prep";
import { IconCheck, IconClock, IconDeposit, IconPin, IconX } from "@/components/landing/icons";

type Props = {
  data: PublicData;
  service: PublicService | null;
  popular: boolean;
  onClose: () => void;
  onBook: (s: PublicService) => void;
};

/** Service details: bottom sheet on phones, centered dialog on larger screens. */
export default function ServiceSheet({ data, service, popular, onClose, onBook }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (service && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    }
    if (!service && d.open) d.close();
  }, [service]);

  // Never leave the page scroll-locked, even if the sheet unmounts while open.
  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  const handleClose = () => {
    document.documentElement.style.overflow = "";
    onClose();
  };

  const s = service;
  const addons = s ? data.addons.filter((a) => s.addonIds.includes(a.id)) : [];
  const forms = s ? data.forms.filter((f) => s.formIds.includes(f.id)) : [];
  const places = s ? placesLabel(data.locations.filter((l) => s.locationIds.includes(l.id)).map((l) => l.city)) : "";
  const prep = s ? guidesFor(s.categoryName, s.name)[0] : undefined;

  return (
    <dialog
      ref={ref}
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      aria-labelledby="sheet-title"
      className="m-0 mt-auto max-h-[90svh] w-full max-w-none overflow-hidden rounded-t-[2rem] bg-plaster p-0 text-ink shadow-[0_-20px_60px_-20px_rgba(58,15,28,0.6)] backdrop:bg-oxblood/60 open:animate-sheet-up sm:m-auto sm:max-h-[86vh] sm:max-w-xl sm:rounded-[2rem] sm:open:animate-dialog-in"
    >
      {s && (
        <div className="flex max-h-[inherit] flex-col">
          <div className="relative overflow-y-auto overscroll-contain px-6 pb-6 pt-3 sm:px-8 sm:pt-8">
            <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line-strong/40 sm:hidden" />
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Close"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-panel ring-1 ring-line-strong transition hover:bg-white"
            >
              <IconX size={18} />
            </button>

            <h2 id="sheet-title" className="heading pr-12 text-[2rem]">
              {prettyName(s.name)}
            </h2>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-oxblood pb-4">
              <span className="font-display text-[1.9rem] font-medium leading-none tabular-nums">{priceLabel(s.priceCents)}</span>
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <IconClock size={15} /> {shortDuration(s.durationMin)}
              </span>
              <span className="text-ink-soft">{categoryLabel(s.categoryName)}</span>
              {popular && <span className="rounded-full px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-lacquer ring-1 ring-lacquer">Popular</span>}
            </div>

            {s.description && <p className="mt-5 whitespace-pre-line leading-relaxed">{s.description}</p>}

            <ul className="mt-6 space-y-2.5 rounded-2xl bg-panel p-4 text-[0.95rem] ring-1 ring-line">
              <li className="flex items-start gap-3">
                <IconDeposit size={18} className="mt-0.5 shrink-0 text-lacquer" />
                {s.depositCents > 0 ? `${priceLabel(s.depositCents)} non-refundable deposit to book; the rest is paid at your appointment.` : "No deposit needed."}
              </li>
              {places && (
                <li className="flex items-start gap-3">
                  <IconPin size={18} className="mt-0.5 shrink-0 text-lacquer" /> Available in {places}
                </li>
              )}
              {forms.length > 0 && (
                <li className="flex items-start gap-3">
                  <IconCheck size={18} className="mt-0.5 shrink-0 text-lacquer" />
                  Includes {forms.length === 1 ? "a quick consent form" : `${forms.length} quick consent forms`} when you book
                </li>
              )}
            </ul>

            {addons.length > 0 && (
              <div className="mt-6">
                <h3 className="heading text-[1.3rem]">Add-ons you can include</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {addons.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-panel px-3.5 py-2.5 text-sm ring-1 ring-line">
                      <span>
                        {a.name}
                        <span className="block text-xs text-ink-soft">+ {shortDuration(a.durationMin)}</span>
                      </span>
                      <span className="font-display text-base font-medium tabular-nums">+{priceLabel(a.priceCents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prep && (
              <div className="mt-6">
                <h3 className="heading text-[1.3rem]">How to prepare</h3>
                <ul className="mt-2 space-y-2 text-[0.95rem]">
                  {prep.items.slice(0, 4).map((it) => (
                    <li key={it} className="flex gap-2.5">
                      <IconCheck size={17} strokeWidth={2} className="mt-0.5 shrink-0 text-lacquer" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-brass bg-panel px-6 py-4 sm:px-8">
            <div className="min-w-0 flex-1 text-sm leading-tight">
              <p className="font-display text-xl font-medium">{priceLabel(s.priceCents)}</p>
              <p className="truncate text-ink-soft">{shortDuration(s.durationMin)}</p>
            </div>
            <button
              type="button"
              className="btn-primary px-7 py-3.5"
              onClick={() => {
                document.documentElement.style.overflow = "";
                ref.current?.close();
                onBook(s);
              }}
            >
              Book this service
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
