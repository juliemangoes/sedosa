import Image from "next/image";
import portrait from "@/assets/brand/portrait-hero.jpg";
import type { PublicData } from "@/components/booking/types";
import { categoryLabel, placesLabel, prettyName, shortDuration } from "@/lib/display";
import { IconArrowRight } from "./icons";

export type Openings = {
  serviceId: number;
  serviceName: string;
  durationMin: number;
  slots: { start: string; locationIds: number[]; day: string; time: string; meridiem: string }[];
};

/**
 * The powder room's front wall: lacquered rose, the name set in spaced capitals across
 * the width, the portrait in a tall photo over it, and the next open
 * times waiting on a reservation card.
 */
export default function Hero({ data, openings }: { data: PublicData; openings: Openings | null }) {
  const where = placesLabel(data.locations.map((l) => l.city)) || "Georgia";
  const slotHref = (s: Openings["slots"][number]) => `/?service=${openings!.serviceId}&slot=${encodeURIComponent(s.start)}&loc=${s.locationIds.join(",")}`;

  return (
    <section aria-labelledby="hero-title" className="on-rose lacquer relative isolate overflow-hidden text-oxblood">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-5 sm:px-6 sm:pt-8 lg:pb-12">
        <h1 id="hero-title" className="text-center">
          <span className="sr-only">{data.businessName}</span>
          <span aria-hidden="true" className="font-display block select-none text-[clamp(3.4rem,17vw,14rem)] font-medium leading-[0.86] tracking-[0.1em] [margin-right:-0.1em]">
            SEDOSA
          </span>
        </h1>

        <div className="relative z-10 -mt-[clamp(1.6rem,8.4vw,5.6rem)] grid grid-cols-[auto_1fr] items-end gap-x-5 gap-y-6 sm:grid-cols-1 sm:gap-x-10 lg:grid-cols-[1fr_auto_1fr]">
          {/* The portrait */}
          <figure className="w-[42vw] max-w-[11rem] sm:mx-auto sm:w-60 sm:max-w-none lg:order-2 lg:w-[17rem]">
            <div className="photo-frame aspect-[371/617] rounded-[1.75rem] bg-plaster-2 shadow-[0_30px_50px_-26px_rgba(58,15,28,0.75)]">
              <Image
                src={portrait}
                alt={`A styled portrait at ${data.businessName}`}
                loading="eager"
                fetchPriority="high"
                sizes="(min-width: 1024px) 17rem, (min-width: 640px) 15rem, 42vw"
                placeholder="blur"
                className="size-full object-cover"
              />
            </div>
          </figure>

          {/* What, where, when */}
          <div className="pb-1 sm:text-center lg:order-1 lg:pb-3 lg:text-left">
            <p className="max-w-[22rem] text-[1.05rem] leading-snug sm:mx-auto sm:text-xl lg:mx-0">Brows, Korean lash lifts, PMU and waxing in {where}.</p>
            <p className="mt-3 text-[0.9rem] sm:text-[0.95rem]">
              {data.hoursHeadline.split(" · ").map((part, i) => (
                <span key={part} className="block sm:inline">
                  {i > 0 && <span className="hidden sm:inline"> · </span>}
                  {part}
                </span>
              ))}
            </p>
            <a href="#services" className="btn-primary mt-6 hidden lg:inline-flex">
              Book an appointment <IconArrowRight size={17} />
            </a>
          </div>

          {/* The reservation card */}
          <div className="col-span-2 sm:col-span-1 lg:order-3 lg:pb-3">
            <ReservationCard data={data} openings={openings} slotHref={slotHref} />
          </div>
        </div>

        <nav aria-label="Jump to a category" className="mt-8 lg:mt-12">
          <ul className="no-scrollbar -mx-4 flex snap-x gap-x-6 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-y-2 sm:overflow-visible sm:px-0">
            {data.categories.map((c) => (
              <li key={c.id} className="shrink-0 snap-start">
                <a href={`#cat-${c.id}`} className="caps inline-block py-2 text-oxblood underline-offset-[0.45em] hover:underline">
                  {categoryLabel(c.name)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}

function ReservationCard({ data, openings, slotHref }: { data: PublicData; openings: Openings | null; slotHref: (s: Openings["slots"][number]) => string }) {
  const has = !!openings && openings.slots.length > 0;
  return (
    <div className="mx-auto max-w-sm rounded-[1.75rem] bg-panel p-1.5 shadow-[0_24px_48px_-24px_rgba(58,15,28,0.55)] lg:mr-0">
      <div className="rounded-[1.4rem] p-5 ring-1 ring-brass sm:p-6">
        <h2 className="font-display text-[1.6rem] font-medium leading-tight">{has ? "Next openings" : "Reserve your time"}</h2>
        {has ? (
          <>
            <p className="mt-1 text-sm text-ink-soft">
              {prettyName(openings!.serviceName)} · {shortDuration(openings!.durationMin)}
            </p>
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {openings!.slots.map((s) => (
                <li key={s.start}>
                  <a
                    href={slotHref(s)}
                    className="flex h-full flex-col items-center rounded-2xl px-1 py-3 text-center ring-1 ring-line-strong transition duration-200 hover:bg-plaster hover:ring-lacquer"
                    aria-label={`Book ${prettyName(openings!.serviceName)} on ${s.day} at ${s.time} ${s.meridiem}`}
                  >
                    <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-soft">{s.day}</span>
                    <span className="font-display mt-1 text-[1.45rem] font-medium leading-none tabular-nums">{s.time}</span>
                    <span className="mt-1 text-[0.7rem] font-medium uppercase tracking-[0.12em]">{s.meridiem}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <a href={`/?service=${openings!.serviceId}`} className="font-medium text-lacquer underline decoration-line underline-offset-4 hover:decoration-lacquer">
                See all times
              </a>
              <a href="#services" className="text-ink-soft hover:text-lacquer">
                Another service
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-ink-soft">Choose a service from the menu to see every open time across {data.locations.length > 1 ? "both studios" : "the studio"}.</p>
            <a href="#services" className="btn-primary mt-5 w-full">
              See the menu <IconArrowRight size={17} />
            </a>
          </>
        )}
      </div>
    </div>
  );
}
