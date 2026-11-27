import Image from "next/image";
import resultOne from "@/assets/brand/result-brows-1.jpg";
import resultTwo from "@/assets/brand/result-brows-2.jpg";
import type { PublicData } from "@/components/booking/types";
import { PREP_ALWAYS, PREP_GUIDES } from "@/content/prep";
import { placesLabel, priceLabel } from "@/lib/display";
import { prettyPhone, normalizePhone } from "@/lib/format";
import { revealDelay } from "@/lib/motion";
import { IconArrowRight, IconCheck, IconInstagram } from "./icons";
import Wordmark from "./Wordmark";

/** A framed panel: rose-white card with a brass rule set just inside its edge. */
function Framed({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[1.75rem] bg-panel p-1.5 shadow-[0_20px_44px_-28px_rgba(58,15,28,0.5)] ${className}`}>
      <div className="h-full rounded-[1.4rem] p-6 ring-1 ring-brass sm:p-8">{children}</div>
    </div>
  );
}

export default function InfoSections({ data }: { data: PublicData }) {
  const phone = normalizePhone(data.phone);
  const handle = data.instagram.replace(/^@/, "");
  const igUrl = handle ? `https://instagram.com/${handle}` : null;
  const waDigits = (() => {
    let d = data.whatsappNumber.replace(/\D/g, "");
    if (d.length === 10) d = `1${d}`;
    return d.length >= 11 && d.length <= 15 ? d : null;
  })();
  const waUrl = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi ${data.businessName}! `)}` : null;
  const fbUrl = data.facebook ? `https://facebook.com/${data.facebook}` : null;
  const where = placesLabel(data.locations.map((l) => l.city));
  const n = data.locations.length;
  const visitTitle = !where ? "Visit the studio" : n > 1 ? `${n === 2 ? "Two" : n} studios, ${where}` : `Find us in ${where}`;
  const contactLink = "block border-b border-line py-3 hover:border-lacquer hover:text-lacquer";

  // Photo wall: the owner's photos first, then the studio's real results.
  const wall = [
    ...data.gallery.map((g) => ({
      key: g.url,
      src: g.url,
      alt: g.alt,
      builtIn: null as null | typeof resultOne,
    })),
    {
      key: "result-1",
      src: resultOne.src,
      alt: "A client's freshly shaped and tinted brows, close up",
      builtIn: resultOne,
    },
    {
      key: "result-2",
      src: resultTwo.src,
      alt: "Another client's fresh brow result, close up",
      builtIn: resultTwo,
    },
  ];

  return (
    <>
      {/* The photo wall (once the owner has added photos) */}
      {data.gallery.length > 0 && (
        <section aria-labelledby="results-title" className="overflow-hidden pb-16 pt-4 sm:pb-24">
          <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 sm:px-8">
            <div>
              <h2 id="results-title" className="heading text-[clamp(2.4rem,7vw,3.75rem)] text-oxblood">
                Fresh from the chair
              </h2>
              <p className="mt-4 max-w-md text-lg text-ink-soft">
                Real work from the studio. Show yours off and tag {handle ? <span className="font-medium text-lacquer">@{handle}</span> : "the studio"} in your selfies.
              </p>
            </div>
            {igUrl && (
              <a href={igUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <IconInstagram size={18} /> See more on Instagram
              </a>
            )}
          </div>
          <ul className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 sm:gap-5 sm:px-8 [&>li:first-child]:ms-auto [&>li:last-child]:me-auto">
            {wall.map((w, i) => {
              return (
                <li key={w.key} className="w-[68vw] shrink-0 snap-center sm:w-60 lg:w-64">
                  <figure data-reveal style={revealDelay(Math.min(i, 5) * 90)}>
                    <div className="photo-frame aspect-[4/5]">
                      {w.builtIn ? (
                        <Image
                          src={w.builtIn}
                          alt={w.alt}
                          sizes="(min-width: 1024px) 18rem, (min-width: 640px) 16rem, 72vw"
                          placeholder="blur"
                          className="size-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.src} alt={w.alt} loading="lazy" decoding="async" className="size-full object-cover" />
                      )}
                    </div>
                  </figure>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Policies */}
      <section aria-labelledby="policies-title" id="policies" className="scroll-mt-20 px-2.5 sm:px-4">
        <div className="mx-auto grid max-w-[74rem] gap-12 rounded-[1.75rem] bg-plaster px-5 py-14 sm:px-10 sm:py-20 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:px-14">
          <div>
            <h2 id="policies-title" className="heading text-[clamp(2.4rem,7vw,3.75rem)] text-oxblood">
              Booking policies
            </h2>
            <p className="mt-4 max-w-md text-lg text-ink-soft">Please read these before you book. They keep the calendar fair for everyone.</p>

            <Framed className="mt-10">
              <h3 className="heading text-[1.6rem] text-oxblood">How to pay</h3>
              <dl className="mt-5 space-y-5 text-[0.98rem]">
                <div>
                  <dt className="caps text-ink-soft">
                    Deposit
                    {data.depositCents > 0 ? `, ${priceLabel(data.depositCents)} non-refundable` : ""}
                  </dt>
                  <dd className="mt-1.5">
                    {data.onlineDeposit
                      ? "By card when you book. Your card is kept on file for the no-show fee."
                      : `Cash App${data.cashAppHandle ? ` (${data.cashAppHandle})` : ""} or Zelle${data.zelleHandle ? ` (${data.zelleHandle})` : ""}, within 24 hours of booking.`}
                  </dd>
                </div>
                <div>
                  <dt className="caps text-ink-soft">The rest, at your appointment</dt>
                  <dd className="mt-1.5">Cash, Cash App or Zelle.</dd>
                </div>
              </dl>
            </Framed>
          </div>

          <dl className="divide-y divide-line border-y border-oxblood">
            {data.policies.map((p) => (
              <div key={p.title} className="grid gap-2 py-6 sm:grid-cols-[13rem_1fr] sm:gap-8 sm:py-7">
                <dt className="heading text-[1.35rem] tracking-[0.03em] text-oxblood">{p.title}</dt>
                <dd className="leading-relaxed">{p.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Prep */}
      <section aria-labelledby="prep-title" id="prep" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <h2 id="prep-title" className="heading text-[clamp(2.4rem,7vw,3.75rem)] text-oxblood">
            How to prepare
          </h2>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">A few simple things so your results come out at their best.</p>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
            {PREP_GUIDES.map((g, gi) => (
              <article key={g.id} className={gi === 0 ? "md:pr-8" : gi === PREP_GUIDES.length - 1 ? "md:pl-8" : "md:px-8"}>
                <h3 className="heading border-b border-oxblood pb-3 text-[1.55rem] tracking-[0.03em] text-oxblood">{g.title}</h3>
                <ul className="mt-5 space-y-3.5">
                  {g.items.map((it) => (
                    <li key={it} className="flex gap-3 leading-snug">
                      <IconCheck size={17} strokeWidth={2} className="mt-0.5 shrink-0 text-lacquer" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="mt-12 border-t border-line pt-6 text-[0.98rem]">
            <span className="font-medium">For every appointment: </span>
            {PREP_ALWAYS.join(" · ")}
          </p>
        </div>
      </section>

      {/* Visit */}
      <section aria-labelledby="visit-title" id="visit" className="scroll-mt-20 border-t border-line pb-16 pt-16 sm:pb-24 sm:pt-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-8">
          <h2 id="visit-title" className="sr-only">
            {visitTitle}
          </h2>
          <div className="grid gap-14 md:grid-cols-3 md:gap-8">
            <div>
              <h3 className="heading text-[clamp(1.9rem,4vw,2.4rem)] text-oxblood">Business hours</h3>
              {data.hours.map((g) => (
                <div key={g.label} className="mt-5">
                  {data.hours.length > 1 && <p className="caps mb-2 text-lacquer">{g.label}</p>}
                  <dl className="space-y-2.5">
                    {g.rows.map((r) => (
                      <div key={r.days}>
                        <dt className="font-medium uppercase tracking-[0.08em]">{r.days}</dt>
                        <dd className={`tabular-nums ${r.closed ? "text-ink-soft" : ""}`}>{r.hours}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>

            <div>
              <h3 className="heading text-[clamp(1.9rem,4vw,2.4rem)] text-oxblood">{data.locations.length > 1 ? "Locations" : "Location"}</h3>
              <ul className="mt-5 space-y-4">
                {data.locations.map((l) => (
                  <li key={l.id}>
                    <p className="font-medium uppercase tracking-[0.08em]">{l.city ?? l.name}</p>
                    {l.city && <p className="text-ink-soft">{l.name}</p>}
                  </li>
                ))}
              </ul>
              <p className="mx-auto mt-5 max-w-xs text-[0.95rem] text-ink-soft">{data.locationNote}</p>
            </div>

            <div>
              <h3 className="heading text-[clamp(1.9rem,4vw,2.4rem)] text-oxblood">Say hello</h3>
              <ul className="mx-auto mt-3 flex max-w-xs flex-col">
                {phone && (
                  <>
                    <li>
                      <a href={`tel:${phone}`} className={contactLink}>
                        Call {prettyPhone(phone)}
                      </a>
                    </li>
                    <li>
                      <a href={`sms:${phone}`} className={contactLink}>
                        Send a text
                      </a>
                    </li>
                  </>
                )}
                {waUrl && (
                  <li>
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className={contactLink}>
                      WhatsApp me
                    </a>
                  </li>
                )}
                {data.email && (
                  <li>
                    <a href={`mailto:${data.email}`} className={`${contactLink} break-all`}>
                      {data.email}
                    </a>
                  </li>
                )}
                {igUrl && (
                  <li>
                    <a href={igUrl} target="_blank" rel="noopener noreferrer" className={contactLink}>
                      Instagram @{handle}
                    </a>
                  </li>
                )}
                {fbUrl && (
                  <li>
                    <a href={fbUrl} target="_blank" rel="noopener noreferrer" className={contactLink}>
                      Facebook
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The closing wall */}
      <section aria-labelledby="closing-title" className="p-2.5 sm:p-4">
        <div className="on-rose lacquer rounded-[1.4rem] px-5 py-16 text-center text-oxblood sm:rounded-[1.9rem] sm:py-20">
          <h2 id="closing-title" className="heading text-[clamp(2.6rem,8vw,4.5rem)]">
            Ready when you are
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg">Pick a service and an open time. Booking takes about a minute.</p>
          <a href="#services" className="btn-primary mt-8">
            Book your appointment <IconArrowRight size={17} />
          </a>
        </div>
      </section>
    </>
  );
}

export function SiteFooter({ data }: { data: PublicData }) {
  const phone = normalizePhone(data.phone);
  const link = "underline-offset-[0.4em] hover:underline";
  return (
    <footer className="on-rose bg-rose pb-28 pt-10 text-oxblood sm:pb-10">
      <div className="mx-auto flex max-w-[78rem] flex-col gap-8 px-5 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <Wordmark businessName={data.businessName} size="lg" />
          <p className="mt-4 max-w-sm text-[0.95rem]">Already booked? Use the link in your confirmation email to reschedule or cancel.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[0.78rem] font-medium uppercase tracking-[0.14em]">
          <a href="#services" className={link}>
            Services
          </a>
          <a href="#policies" className={link}>
            Policies
          </a>
          <a href="#prep" className={link}>
            Prep
          </a>
          <a href="#visit" className={link}>
            Visit
          </a>
          {phone && (
            <a href={`tel:${phone}`} className={link}>
              {prettyPhone(phone)}
            </a>
          )}
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-[78rem] px-5 text-xs sm:px-8">
        © {new Date().getFullYear()} {data.businessName}
      </p>
    </footer>
  );
}
