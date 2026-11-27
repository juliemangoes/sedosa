import Image from "next/image";
import portrait from "@/assets/brand/portrait-hero.jpg";
import resultOne from "@/assets/brand/result-brows-1.jpg";
import resultTwo from "@/assets/brand/result-brows-2.jpg";
import type { PublicData } from "@/components/booking/types";
import { placesLabel, prettyName, shortDuration } from "@/lib/display";
import { revealDelay } from "@/lib/motion";
import { IconArrowRight } from "./icons";

export type Openings = {
  serviceId: number;
  serviceName: string;
  durationMin: number;
  slots: {
    start: string;
    locationIds: number[];
    day: string;
    time: string;
    meridiem: string;
  }[];
};

/**
 * Top of the page: a big rounded photo with the name in condensed capitals,
 * the next open times right under it, then "Meet your artist".
 */
export default function Hero({ data, openings }: { data: PublicData; openings: Openings | null }) {
  return (
    <>
      <HeroPhoto data={data} />
      <OpeningsStrip openings={openings} />
      <MeetArtist data={data} />
    </>
  );
}

const veil = "bg-[linear-gradient(to_top,rgba(36,6,16,0.8),rgba(36,6,16,0.3)_50%,rgba(36,6,16,0.05)_78%)]";

function Title({ businessName, size }: { businessName: string; size: string }) {
  return (
    <h1 id="hero-title">
      <span className="sr-only">{businessName}</span>
      <span aria-hidden="true" className={`heading block select-none leading-[0.84] tracking-[0.03em] [margin-right:-0.03em] ${size}`}>
        SEDOSA
      </span>
    </h1>
  );
}

function HeroPhoto({ data }: { data: PublicData }) {
  const where = placesLabel(data.locations.map((l) => l.city)) || "Georgia";
  const wide = !!data.hero && data.hero.width / data.hero.height >= 1.2;
  const sub = (
    <p className="mt-4 text-[0.78rem] font-medium uppercase tracking-[0.28em]">
      <span className="block sm:inline">Beauty Studio</span>
      <span className="hidden sm:inline"> · </span>
      <span className="mt-1.5 block tracking-[0.18em] sm:mt-0 sm:inline sm:tracking-[0.28em]">{where}</span>
    </p>
  );

  if (wide) {
    const h = data.hero!;
    return (
      <section aria-labelledby="hero-title" className="p-2.5 sm:p-4">
        <div className="relative isolate overflow-hidden rounded-[1.4rem] sm:rounded-[1.9rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={h.url} alt={h.alt} width={h.width} height={h.height} fetchPriority="high" className="absolute inset-0 -z-10 size-full object-cover" />
          <div aria-hidden="true" className={`absolute inset-0 -z-10 ${veil}`} />
          <div className="flex min-h-[27rem] flex-col items-center justify-end px-5 pb-8 pt-24 text-center text-panel sm:min-h-[36rem] lg:min-h-[40rem] lg:pb-12">
            <Title businessName={data.businessName} size="text-[clamp(4.6rem,17vw,11.5rem)]" />
            {sub}
            <a href="#services" className="btn-rose mt-7">
              Book an appointment <IconArrowRight size={17} />
            </a>
          </div>
        </div>
      </section>
    );
  }

  // The studio portrait is tall: behind the title on phones, beside it on desktop.
  return (
    <section aria-labelledby="hero-title" className="p-2.5 sm:p-4">
      <div className="relative isolate overflow-hidden rounded-[1.4rem] sm:rounded-[1.9rem] lg:grid lg:grid-cols-[minmax(0,1fr)_27rem] lg:bg-plaster xl:grid-cols-[minmax(0,1fr)_30rem]">
        <div className="absolute inset-0 -z-10 lg:relative lg:inset-auto lg:z-auto lg:order-2 lg:min-h-[36rem]">
          <Image
            src={portrait}
            alt={`A styled portrait at ${data.businessName}`}
            fill
            priority
            sizes="(min-width: 1280px) 30rem, (min-width: 1024px) 27rem, 100vw"
            placeholder="blur"
            className="object-cover object-top lg:object-[50%_12%]"
          />
          <div aria-hidden="true" className={`absolute inset-0 lg:hidden ${veil}`} />
        </div>
        <div className="flex min-h-[27rem] flex-col items-center justify-end px-5 pb-8 pt-24 text-center text-panel sm:min-h-[36rem] lg:min-h-0 lg:items-start lg:justify-center lg:px-14 lg:py-16 lg:text-left lg:text-oxblood">
          <Title businessName={data.businessName} size="text-[clamp(4.6rem,19vw,9.5rem)]" />
          {sub}
          <p className="mt-6 hidden max-w-sm text-lg leading-snug lg:block">
            Brows, Korean lash lifts, PMU and waxing. Pick a service, choose an open time, and you&apos;re booked.
          </p>
          <a href="#services" className="btn-rose mt-7 lg:hidden">
            Book an appointment <IconArrowRight size={17} />
          </a>
          <a href="#services" className="btn-primary mt-8 hidden lg:inline-flex">
            Book an appointment <IconArrowRight size={17} />
          </a>
        </div>
      </div>
    </section>
  );
}

function OpeningsStrip({ openings }: { openings: Openings | null }) {
  if (!openings || openings.slots.length === 0) return null;
  const name = prettyName(openings.serviceName);
  const href = (s: Openings["slots"][number]) => `/?service=${openings.serviceId}&slot=${encodeURIComponent(s.start)}&loc=${s.locationIds.join(",")}`;
  return (
    <section aria-labelledby="openings-title" className="px-2.5 sm:px-4">
      <div className="flex flex-col gap-4 rounded-[1.4rem] bg-plaster px-5 py-5 sm:rounded-[1.6rem] md:flex-row md:items-center md:gap-6 md:px-8">
        <div className="md:mr-auto">
          <h2 id="openings-title" className="heading text-[1.6rem] text-oxblood">
            Next openings
          </h2>
          <p className="mt-1.5 text-sm text-ink-soft">
            {name} · {shortDuration(openings.durationMin)}
          </p>
        </div>
        <ul className="grid grid-cols-3 gap-2 md:flex">
          {openings.slots.map((s) => (
            <li key={s.start}>
              <a
                href={href(s)}
                aria-label={`Book ${name} on ${s.day} at ${s.time} ${s.meridiem}`}
                className="flex flex-col items-center rounded-2xl bg-panel px-2 py-2.5 text-center ring-1 ring-line-strong transition duration-200 hover:ring-2 hover:ring-lacquer md:min-w-28 md:px-4"
              >
                <span className="text-[0.66rem] font-medium uppercase tracking-[0.12em] text-ink-soft">{s.day}</span>
                <span className="mt-0.5 text-[1.25rem] font-medium leading-tight tabular-nums">
                  {s.time} <span className="text-[0.7rem] font-medium uppercase tracking-[0.1em]">{s.meridiem}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <a href={`/?service=${openings.serviceId}`} className="text-sm font-medium text-lacquer underline decoration-line underline-offset-4 hover:decoration-lacquer">
          See all times
        </a>
      </div>
    </section>
  );
}

function MeetArtist({ data }: { data: PublicData }) {
  const { name, bio } = data.artist;
  const hasIntro = !!(name || bio);
  const where = placesLabel(data.locations.map((l) => l.city));
  // The owner's first two photos, topped up with the studio's own results.
  const builtIn = [
    {
      key: "result-1",
      alt: "A client's freshly shaped and tinted brows, close up",
      img: resultOne,
    },
    {
      key: "result-2",
      alt: "Another client's fresh brow result, close up",
      img: resultTwo,
    },
  ];
  const photos = [...data.gallery.slice(0, 2).map((g) => ({ key: g.url, alt: g.alt, url: g.url })), ...builtIn].slice(0, 2);
  const paragraphs = bio
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section id="artist" aria-labelledby="artist-title" className="scroll-mt-20 px-2.5 pt-12 sm:px-4 sm:pt-16">
      <div className="mx-auto grid max-w-5xl gap-8 rounded-[1.75rem] bg-plaster p-6 sm:p-10 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-12">
        <div>
          <h2 id="artist-title" className="heading text-[clamp(2.1rem,5vw,2.9rem)] text-oxblood">
            {hasIntro ? "Meet your artist" : "Welcome to the studio"}
          </h2>
          {name && <p className="heading mt-4 text-[1.35rem] tracking-[0.05em] text-lacquer">{name}</p>}
          <div className="mt-4 max-w-[34rem] space-y-4 text-[1.05rem] leading-relaxed">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <>
                <p>
                  {data.businessName} is a brow and lash studio
                  {where ? ` in ${where}` : ""}: brow shaping and lamination, Korean lash lifts, PMU and waxing, all by appointment.
                </p>
                <p>Choose a service below, pick an open time, and you&apos;re booked. Your confirmation and prep tips arrive right after.</p>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 items-start gap-3 pb-6 sm:gap-4 md:pb-8">
          {photos.map((p, i) => (
            <figure key={p.key} data-reveal style={revealDelay(i * 120)} className={`photo-frame aspect-[3/4] rounded-[1.4rem] ${i === 1 ? "translate-y-6 md:translate-y-8" : ""}`}>
              {"img" in p ? (
                <Image src={p.img} alt={p.alt} fill sizes="(min-width: 768px) 14rem, 45vw" placeholder="blur" className="object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt={p.alt} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
