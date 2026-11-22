import Image from "next/image";
import results from "@/assets/brand/results.jpg";
import type { PublicData } from "@/components/booking/types";
import { PREP_ALWAYS, PREP_GUIDES } from "@/content/prep";
import { placesLabel, priceLabel } from "@/lib/display";
import { prettyPhone, normalizePhone } from "@/lib/format";
import { popIndex, revealDelay } from "@/lib/motion";
import {
  IconCalendar,
  IconCancel,
  IconCard,
  IconCash,
  IconChat,
  IconCheck,
  IconClock,
  IconDeposit,
  IconFacebook,
  IconHeart,
  IconInstagram,
  IconLate,
  IconMail,
  IconPhone,
  IconPin,
  Sparkle,
} from "./icons";

function policyIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("deposit")) return IconDeposit;
  if (t.includes("late")) return IconLate;
  if (t.includes("cancel")) return IconCancel;
  if (t.includes("appoint") || t.includes("book")) return IconCalendar;
  return IconHeart;
}

function SectionHead({ kicker, title, children, id }: { kicker: string; title: string; children?: React.ReactNode; id: string }) {
  return (
    <div data-reveal className="mx-auto max-w-2xl text-center">
      <p className="kicker text-sm text-plum">{kicker}</p>
      <h2 id={id} className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {children && <p className="mt-3 text-lg text-ink/75">{children}</p>}
    </div>
  );
}

export default function InfoSections({ data }: { data: PublicData }) {
  const phone = normalizePhone(data.phone);
  const igUrl = data.instagram ? `https://instagram.com/${data.instagram.replace(/^@/, "")}` : null;
  const fbUrl = data.facebook ? `https://facebook.com/${data.facebook}` : null;
  const where = placesLabel(data.locations.map((l) => l.city));
  const n = data.locations.length;
  const visitTitle = !where ? "Visit the studio" : n > 1 ? `${n === 2 ? "Two" : n} studios in ${where}` : `Find us in ${where}`;

  return (
    <>
      {/* Policies */}
      <section aria-labelledby="policies-title" id="policies" className="scroll-mt-20 bg-petal/60 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead id="policies-title" kicker="Before you book" title="Booking policies">
            Please read these before booking. They keep things fair for everyone ♡
          </SectionHead>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.policies.map((p, i) => {
              const Icon = policyIcon(p.title);
              return (
                <li key={p.title} data-reveal style={revealDelay(i * 110)}>
                  <div className="group h-full rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-petal-line transition duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-[0_22px_44px_-24px_rgba(109,43,103,0.6)]">
                    <span className="grid size-11 place-items-center rounded-2xl bg-black text-neon transition duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:shadow-[0_0_26px_rgba(255,92,191,0.55)]">
                      <Icon size={22} />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-ink/80">{p.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div data-reveal="scale" className="mt-6 grid gap-4 rounded-3xl bg-black p-6 text-[#fde7f5] sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8 sm:p-8">
            <div>
              <p className="kicker text-sm text-neon-soft">Payments</p>
              <p className="mt-1 text-xl font-semibold">How to pay</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-[#f3cde6]">Deposit{data.depositCents > 0 ? ` (${priceLabel(data.depositCents)}, non-refundable)` : ""}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2">
                  {data.onlineDeposit ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm">
                      <IconCard size={16} /> Card, when you book
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm">Cash App{data.cashAppHandle && ` · ${data.cashAppHandle}`}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm">Zelle{data.zelleHandle && ` · ${data.zelleHandle}`}</span>
                      <span className="text-sm text-[#f3cde6]">due within 24 hours of booking</span>
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#f3cde6]">The rest, at your appointment</p>
                <p className="mt-1 flex flex-wrap gap-2">
                  {["Cash", "Cash App", "Zelle"].map((m) => (
                    <span key={m} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm">
                      {m === "Cash" && <IconCash size={16} />}
                      {m}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prep */}
      <section aria-labelledby="prep-title" id="prep" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead id="prep-title" kicker="Get ready" title="How to prepare">
            A few simple things so your results come out their best.
          </SectionHead>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PREP_GUIDES.map((g, gi) => (
              <div key={g.id} data-reveal style={revealDelay(gi * 130)}>
                <article className="group h-full rounded-3xl bg-white/70 p-6 ring-1 ring-petal-line transition duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-[0_22px_44px_-24px_rgba(109,43,103,0.6)]">
                  <h3 className="flex items-center gap-2 text-xl font-semibold">
                    <Sparkle className="text-neon transition-transform duration-500 group-hover:rotate-90 group-hover:scale-125" size={14} /> {g.title}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {g.items.map((it, i) => (
                      <li key={it} className="flex gap-3 leading-snug">
                        <span className="reveal-pop mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-plum text-white" style={popIndex(i + gi)}>
                          <IconCheck size={13} strokeWidth={2.6} />
                        </span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            ))}
          </div>
          <div data-reveal className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="kicker mr-1 text-plum">Every appointment</span>
            {PREP_ALWAYS.map((it) => (
              <span key={it} className="rounded-full bg-black px-3.5 py-1.5 text-white">
                {it}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Visit */}
      <section aria-labelledby="visit-title" id="visit" className="scroll-mt-20 bg-petal/60 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead id="visit-title" kicker="Visit" title={visitTitle} />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <div data-reveal style={revealDelay(0)} className="rounded-3xl bg-white/80 p-6 ring-1 ring-petal-line">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <IconPin className="text-plum" /> Locations
              </h3>
              <ul className="mt-4 space-y-3">
                {data.locations.map((l) => (
                  <li key={l.id}>
                    <p className="font-semibold">{l.city ?? l.name}</p>
                    <p className="text-sm text-ink/70">{l.name}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-2xl bg-blush px-4 py-3 text-sm">{data.locationNote}</p>
            </div>

            <div data-reveal style={revealDelay(120)} className="rounded-3xl bg-white/80 p-6 ring-1 ring-petal-line">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <IconClock className="text-plum" /> Booking hours
              </h3>
              {data.hours.map((g) => (
                <div key={g.label} className="mt-4">
                  {data.hours.length > 1 && <p className="label-caps mb-1 text-plum">{g.label}</p>}
                  <dl className="divide-y divide-petal-line">
                    {g.rows.map((r) => (
                      <div key={r.days} className="flex justify-between gap-4 py-2">
                        <dt className="font-medium">{r.days}</dt>
                        <dd className={r.closed ? "text-ink/70" : ""}>{r.hours}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>

            <div data-reveal style={revealDelay(240)} className="rounded-3xl bg-white/80 p-6 ring-1 ring-petal-line">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <IconHeart className="text-plum" /> Say hi
              </h3>
              <ul className="mt-4 space-y-1">
                {phone && (
                  <>
                    <li>
                      <a href={`tel:${phone}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-blush">
                        <IconPhone className="text-plum" /> Call {prettyPhone(phone)}
                      </a>
                    </li>
                    <li>
                      <a href={`sms:${phone}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-blush">
                        <IconChat className="text-plum" /> Text me
                      </a>
                    </li>
                  </>
                )}
                {data.email && (
                  <li>
                    <a href={`mailto:${data.email}`} className="flex items-center gap-3 break-all rounded-xl px-2 py-2 hover:bg-blush">
                      <IconMail className="shrink-0 text-plum" /> {data.email}
                    </a>
                  </li>
                )}
                {igUrl && (
                  <li>
                    <a href={igUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-blush">
                      <IconInstagram className="text-plum" /> @{data.instagram.replace(/^@/, "")}
                    </a>
                  </li>
                )}
                {fbUrl && (
                  <li>
                    <a href={fbUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-blush">
                      <IconFacebook className="text-plum" /> {data.facebook}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section aria-labelledby="results-title" className="on-dark relative isolate overflow-hidden bg-noir text-[#fde7f5]">
        <div aria-hidden="true" className="absolute -right-32 top-10 -z-10 size-[30rem] rounded-full bg-neon/20 blur-[120px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div data-reveal="left" className="text-center lg:text-left">
            <p className="kicker text-sm text-neon-soft">Real clients ♡</p>
            <h2 id="results-title" className="neon-text reveal-flicker mt-2 font-script text-6xl leading-tight sm:text-7xl">
              Tag us in your selfies
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-[#f6d9ec] lg:mx-0">
              Fresh brows and lifted lashes were made for the camera. Show them off and tag
              {data.instagram ? ` @${data.instagram.replace(/^@/, "")}` : " the studio"}.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
              <a href="#services" className="btn-neon whitespace-nowrap px-7 py-3.5 text-sm">
                Book your appointment
              </a>
              {igUrl && (
                <a href={igUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost whitespace-nowrap px-7 py-3.5 text-sm">
                  <IconInstagram size={18} /> See more on Instagram
                </a>
              )}
            </div>
          </div>
          <div data-reveal="right" className="relative mx-auto w-full max-w-md lg:max-w-lg">
            <div className="animate-float [animation-duration:8s]">
              <Image
                src={results}
                alt="Two clients showing their fresh brow and lash results in phone selfies"
                sizes="(min-width: 1024px) 34rem, 90vw"
                placeholder="blur"
                className="h-auto w-full rounded-[2rem]"
              />
            </div>
            <Sparkle className="absolute -left-2 top-[12%] animate-twinkle text-white drop-shadow-[0_0_8px_#fff]" size={18} />
            <Sparkle className="absolute -right-1 bottom-[18%] animate-twinkle text-neon-soft [animation-delay:1.1s]" size={14} />
          </div>
        </div>
      </section>
    </>
  );
}

export function SiteFooter({ data }: { data: PublicData }) {
  const phone = normalizePhone(data.phone);
  return (
    <footer className="on-dark border-t border-white/10 bg-noir pb-28 pt-10 text-sm text-[#e9c9de] sm:pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="font-semibold text-white">{data.businessName}</p>
          <p className="mt-1 max-w-sm">Already booked? Use the link in your confirmation email to reschedule or cancel.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <a href="#services" className="hover:text-white">
            Services
          </a>
          <a href="#policies" className="hover:text-white">
            Policies
          </a>
          <a href="#prep" className="hover:text-white">
            Prep
          </a>
          <a href="#visit" className="hover:text-white">
            Visit
          </a>
          {phone && (
            <a href={`tel:${phone}`} className="hover:text-white">
              {prettyPhone(phone)}
            </a>
          )}
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-4 text-xs text-[#b993ad] sm:px-6">
        © {new Date().getFullYear()} {data.businessName}
      </p>
    </footer>
  );
}
