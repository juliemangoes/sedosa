import Image from "next/image";
import resultOne from "@/assets/brand/result-brows-1.jpg";
import resultTwo from "@/assets/brand/result-brows-2.jpg";
import type { PublicData } from "@/components/booking/types";
import { PREP_ALWAYS, PREP_GUIDES } from "@/content/prep";
import { placesLabel, priceLabel } from "@/lib/display";
import { prettyPhone, normalizePhone } from "@/lib/format";
import { revealDelay } from "@/lib/motion";
import { IconArrowRight, IconCheck, IconInstagram } from "./icons";

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
  const contactLink = "flex items-center gap-2 border-b border-line py-3 hover:border-lacquer hover:text-lacquer";

  return (
    <>
      {/* Policies */}
      <section aria-labelledby="policies-title" id="policies" className="scroll-mt-20 bg-plaster-2 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[5fr_7fr] lg:gap-16">
          <div>
            <h2 id="policies-title" className="font-display text-[clamp(2.4rem,6vw,3.6rem)] font-medium leading-[1.02]">
              Booking policies
            </h2>
            <p className="mt-4 max-w-md text-lg text-ink-soft">Please read these before you book. They keep the calendar fair for everyone.</p>

            <Framed className="mt-10">
              <h3 className="font-display text-2xl font-medium">How to pay</h3>
              <dl className="mt-5 space-y-5 text-[0.98rem]">
                <div>
                  <dt className="caps text-ink-soft">Deposit{data.depositCents > 0 ? `, ${priceLabel(data.depositCents)} non-refundable` : ""}</dt>
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
                <dt className="font-display text-[1.4rem] font-medium leading-snug">{p.title}</dt>
                <dd className="leading-relaxed">{p.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Prep */}
      <section aria-labelledby="prep-title" id="prep" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="prep-title" className="font-display text-[clamp(2.4rem,6vw,3.6rem)] font-medium leading-[1.02]">
            How to prepare
          </h2>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">A few simple things so your results come out at their best.</p>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
            {PREP_GUIDES.map((g, gi) => (
              <article key={g.id} className={gi === 0 ? "md:pr-8" : gi === PREP_GUIDES.length - 1 ? "md:pl-8" : "md:px-8"}>
                <h3 className="font-display border-b border-oxblood pb-3 text-[1.75rem] font-medium">{g.title}</h3>
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
      <section aria-labelledby="visit-title" id="visit" className="scroll-mt-20 bg-plaster-2 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="visit-title" className="font-display text-[clamp(2.4rem,6vw,3.6rem)] font-medium leading-[1.02]">
            {visitTitle}
          </h2>
          <div className="mt-12 grid gap-12 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-line">
            <div className="lg:pr-10">
              <h3 className="caps text-ink-soft">Locations</h3>
              <ul className="mt-4 space-y-4">
                {data.locations.map((l) => (
                  <li key={l.id}>
                    <p className="font-display text-[1.5rem] font-medium leading-tight">{l.city ?? l.name}</p>
                    <p className="text-ink-soft">{l.name}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[0.95rem] text-ink-soft">{data.locationNote}</p>
            </div>

            <div className="lg:px-10">
              <h3 className="caps text-ink-soft">Booking hours</h3>
              {data.hours.map((g) => (
                <div key={g.label} className="mt-4">
                  {data.hours.length > 1 && <p className="mb-1 font-medium">{g.label}</p>}
                  <dl className="divide-y divide-line">
                    {g.rows.map((r) => (
                      <div key={r.days} className="flex justify-between gap-4 py-2.5">
                        <dt className="font-medium">{r.days}</dt>
                        <dd className={`tabular-nums ${r.closed ? "text-ink-soft" : ""}`}>{r.hours}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>

            <div className="lg:pl-10">
              <h3 className="caps text-ink-soft">Say hello</h3>
              <ul className="mt-2 flex flex-col">
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

      {/* The closing room */}
      <section aria-labelledby="results-title" className="on-dark relative overflow-hidden bg-oxblood text-plaster">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.1fr]">
          <div className="text-center lg:text-left">
            <h2 id="results-title" className="font-display text-[clamp(2.6rem,7vw,4.4rem)] font-medium leading-[1.02]">
              Fresh from the chair
            </h2>
            <p className="mx-auto mt-5 max-w-md text-lg lg:mx-0">
              Real brows from the studio. Show yours off and tag {handle ? <span className="text-brass-light">@{handle}</span> : "the studio"} in your selfies.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a href="#services" className="btn-rose">
                Book your appointment <IconArrowRight size={17} />
              </a>
              {igUrl && (
                <a href={igUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost-light">
                  <IconInstagram size={18} /> See more on Instagram
                </a>
              )}
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-md items-end justify-center gap-5 sm:gap-7 lg:max-w-none">
            {[
              { img: resultOne, alt: "A client's freshly shaped and tinted brows, close up", cls: "w-[46%] max-w-[15rem]", delay: 0 },
              { img: resultTwo, alt: "Another client's fresh brow result, close up", cls: "mb-10 w-[42%] max-w-[13.5rem]", delay: 140 },
            ].map((r) => (
              <figure key={r.alt} data-reveal style={revealDelay(r.delay)} className={r.cls}>
                <div className="mirror aspect-[3/4] shadow-[0_0_0_2px_var(--color-brass),0_30px_50px_-24px_rgba(0,0,0,0.8)]">
                  <Image src={r.img} alt={r.alt} sizes="(min-width: 1024px) 15rem, 46vw" placeholder="blur" className="size-full object-cover" />
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function SiteFooter({ data }: { data: PublicData }) {
  const phone = normalizePhone(data.phone);
  const [first, ...rest] = data.businessName.split(" ");
  return (
    <footer className="on-dark border-t border-brass/40 bg-oxblood pb-28 pt-12 text-plaster sm:pb-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="leading-none">
            <span className="font-display block text-3xl font-medium">{first}</span>
            <span className="mt-1 block text-[0.62rem] font-medium uppercase tracking-[0.32em] text-brass-light">{rest.join(" ")}</span>
          </p>
          <p className="mt-4 max-w-sm text-[0.95rem]">Already booked? Use the link in your confirmation email to reschedule or cancel.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[0.78rem] font-medium uppercase tracking-[0.14em]">
          <a href="#services" className="hover:text-brass-light">
            Services
          </a>
          <a href="#policies" className="hover:text-brass-light">
            Policies
          </a>
          <a href="#prep" className="hover:text-brass-light">
            Prep
          </a>
          <a href="#visit" className="hover:text-brass-light">
            Visit
          </a>
          {phone && (
            <a href={`tel:${phone}`} className="hover:text-brass-light">
              {prettyPhone(phone)}
            </a>
          )}
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-6xl px-4 text-xs text-brass-light sm:px-6">
        © {new Date().getFullYear()} {data.businessName}
      </p>
    </footer>
  );
}
