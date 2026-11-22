import Image from "next/image";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { DateTime } from "luxon";
import logo from "@/assets/brand/logo.png";
import { getDb } from "@/db";
import { clientCanChange, findByToken } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import { appUrl, stripeEnabled } from "@/lib/env";
import { money, normalizePhone, prettyPhone } from "@/lib/format";
import { prettyName, shortDuration } from "@/lib/display";
import { googleCalendarLink } from "@/lib/ics";
import { appointmentEvent } from "@/lib/notify";
import { syncCheckoutSession } from "@/lib/stripe";
import { PREP_ALWAYS, guidesFor } from "@/content/prep";
import ManageBooking from "@/components/booking/ManageBooking";
import PayDepositButton from "@/components/booking/PayDepositButton";
import { IconCalendar, IconCancel, IconCheck, IconChevronDown, IconClock, IconInstagram, IconLate, IconPin, Sparkle } from "@/components/landing/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your appointment · Sedosa Beauty Studio", robots: { index: false } };

/** Where each sparkle flies to when a booking is confirmed (px from the check mark). */
const BURST: [number, number][] = [
  [-70, -38], [-48, -78], [0, -92], [52, -76], [74, -30], [80, 22], [-82, 18], [-40, 58], [44, 60],
];

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(user.length - 1, 5)))}@${domain}`;
}

export default async function BookingPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const db = await getDb();
  let found = await findByToken(db, token);
  if (!found) notFound();
  const h = await headers();
  const base = appUrl(new Request(`${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}/`));

  // Returning from Stripe: confirm right away instead of waiting for the webhook.
  if (sp.session_id && stripeEnabled() && found.appointment.stripeCheckoutSessionId === sp.session_id && found.appointment.depositStatus !== "paid") {
    try {
      await syncCheckoutSession(db, sp.session_id, base);
      found = (await findByToken(db, token))!;
    } catch (e) {
      console.error("Checkout sync failed", e);
    }
  }

  const { appointment: a, client } = found;
  const settings = await getSettings(db);
  const zone = settings.timezone;
  const s = a.snapshot;
  const isNew = !!sp.new || !!sp.session_id;
  // What's left to pay on the day, assuming an outstanding deposit gets paid first.
  const atVisit = Math.max(a.priceCents - a.amountPaidCents - (a.depositStatus === "due" ? a.depositCents : 0), 0);
  const ev = appointmentEvent(a, settings, base);
  const resched = clientCanChange(a, settings, "reschedule");
  const cancel = clientCanChange(a, settings, "cancel");
  const holdActive = a.status === "pending" && !!a.holdExpiresAt && a.holdExpiresAt > new Date();
  const start = DateTime.fromJSDate(a.startsAt).setZone(zone);
  const end = DateTime.fromJSDate(a.endsAt).setZone(zone);
  const confirmed = a.status === "confirmed";
  const inactive = a.status === "cancelled" || a.status === "expired" || (a.status === "pending" && !holdActive);
  const guides = guidesFor(s.categoryName, s.serviceName);
  const phone = normalizePhone(settings.phone);
  const ig = settings.instagram.replace(/^@/, "");
  const durationMin = Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60000);
  const celebrate = confirmed && isNew;

  const status = confirmed
    ? {
        Icon: IconCheck,
        kicker: isNew ? "Booking confirmed" : "Your appointment",
        title: isNew ? `You're booked, ${client.firstName}! ♡` : `See you soon, ${client.firstName} ♡`,
        sub: `Your confirmation was sent to ${maskEmail(client.email)}.`,
      }
    : a.status === "pending" && holdActive
      ? { Icon: IconLate, kicker: "Almost done", title: "Pay your deposit to confirm", sub: `Your time is held until ${DateTime.fromJSDate(a.holdExpiresAt!).setZone(zone).toFormat("h:mm a")}.` }
      : a.status === "cancelled"
        ? { Icon: IconCancel, kicker: "Canceled", title: "This appointment was canceled", sub: "We hope to see you another time." }
        : a.status === "expired" || a.status === "pending"
          ? { Icon: IconLate, kicker: "Not completed", title: "This booking expired", sub: "The deposit wasn't paid in time, so the slot was released." }
          : a.status === "completed"
            ? { Icon: IconCheck, kicker: "Thank you", title: `Thanks for visiting, ${client.firstName}!`, sub: "Ready for your next appointment?" }
            : { Icon: IconLate, kicker: "Missed appointment", title: "We missed you", sub: "Book a new time whenever you're ready." };

  return (
    <div className="min-h-screen">
      <header className="on-dark bg-noir">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center rounded-lg" aria-label={`${settings.businessName} home`}>
            <Image src={logo} alt="" sizes="120px" className="h-10 w-auto" />
          </a>
          <a href="/#services" className="btn-ghost px-4 py-2.5">
            Book another
          </a>
        </div>
      </header>

      <section className="on-dark relative isolate overflow-hidden bg-noir pb-20 pt-8 text-center text-[#fde7f5]">
        <div aria-hidden="true" className="absolute left-1/2 top-0 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-neon/25 blur-[110px]" />
        <div className="mx-auto max-w-2xl px-4">
          <div className="relative mx-auto size-16">
            {celebrate && (
              <>
                <span aria-hidden="true" className="absolute inset-0 animate-ripple rounded-full bg-neon [animation-delay:250ms]" />
                <span aria-hidden="true" className="absolute inset-0 animate-ripple rounded-full bg-neon [animation-delay:650ms]" />
                {BURST.map((b, i) => (
                  <Sparkle
                    key={i}
                    className={`absolute left-1/2 top-1/2 -ml-2 -mt-2 animate-burst ${i % 2 ? "text-white" : "text-neon-soft"}`}
                    size={i % 3 === 0 ? 18 : 13}
                    style={{ "--bx": `${b[0]}px`, "--by": `${b[1]}px`, animationDelay: `${300 + i * 40}ms` } as React.CSSProperties}
                  />
                ))}
              </>
            )}
            <span className={`relative grid size-16 animate-pop place-items-center rounded-full ${confirmed || a.status === "completed" ? "bg-neon text-black shadow-[0_0_40px_rgba(255,92,191,0.7)]" : "bg-white/10 text-neon-soft ring-1 ring-white/20"}`}>
              <status.Icon size={32} strokeWidth={2.4} />
            </span>
          </div>
          <p className="kicker mt-5 animate-rise text-sm text-neon-soft [animation-delay:150ms]">{status.kicker}</p>
          <h1 className="mt-2 animate-rise text-3xl font-semibold tracking-tight text-white [animation-delay:230ms] sm:text-4xl">{status.title}</h1>
          <p className="mt-2 animate-rise text-[#f3d6e8] [animation-delay:310ms]">{status.sub}</p>
          {sp.canceled && holdActive && <p className="mt-2 text-sm text-[#f3d6e8]">Payment was canceled. You can try again below.</p>}
        </div>
      </section>

      <main className="relative mx-auto -mt-12 max-w-3xl space-y-5 px-4 pb-16 sm:px-6">
        <section aria-label="Appointment details" className="animate-rise overflow-hidden rounded-3xl [animation-delay:380ms] bg-white shadow-[0_24px_60px_-30px_rgba(109,43,103,0.55)] ring-1 ring-petal-line">
          <div className={`grid gap-4 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8 ${inactive ? "opacity-60" : ""}`}>
            <div className="mx-auto grid w-24 place-items-center rounded-2xl bg-black py-3 text-center text-white sm:mx-0">
              <span className="kicker text-xs text-neon-soft">{start.toFormat("LLL")}</span>
              <span className="text-4xl font-semibold leading-none">{start.day}</span>
              <span className="mt-1 text-xs text-white/70">{start.toFormat("cccc")}</span>
            </div>
            <div className="text-center sm:text-left">
              <p data-testid="appt-when" className={`text-2xl font-semibold ${inactive ? "line-through" : ""}`}>
                {start.toFormat("h:mm")} – {end.toFormat("h:mm a")}
              </p>
              <p className="mt-0.5 text-ink/70">{start.toFormat("cccc, LLLL d, yyyy")}</p>
            </div>
          </div>
          <dl className="grid gap-x-6 gap-y-4 border-t border-petal-line p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <dt className="label-caps text-plum">Service</dt>
              <dd className="mt-1">
                <span className="font-semibold">{prettyName(s.serviceName)}</span>
                <span className="flex items-center gap-1.5 text-sm text-ink/70">
                  <IconClock size={14} /> {shortDuration(durationMin)}
                </span>
                {s.addons.map((x) => (
                  <span key={x.id} className="block text-sm">
                    + {x.name}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="label-caps text-plum">Studio</dt>
              <dd className="mt-1">
                <span className="font-semibold">{s.locationName}</span>
                {confirmed && s.locationAddress ? (
                  <>
                    <span className="block text-sm">{s.locationAddress}</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.locationAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-plum underline-offset-4 hover:underline"
                    >
                      <IconPin size={14} /> Get directions
                    </a>
                  </>
                ) : (
                  <span className="block text-sm text-ink/70">{settings.locationNote}</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="label-caps text-plum">Price</dt>
              <dd className="mt-1">
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold">{money(a.priceCents)}</span>
                  {a.depositCents > 0 && (
                    <span
                      className={`rounded-full px-3 py-1 text-sm ${a.depositStatus === "paid" ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200" : a.depositStatus === "waived" ? "bg-blush" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"}`}
                    >
                      {a.depositStatus === "paid" ? `Deposit ${money(a.depositCents)} paid ✓` : a.depositStatus === "waived" ? "Deposit waived" : `Deposit ${money(a.depositCents)} not paid yet`}
                    </span>
                  )}
                </span>
                {confirmed && atVisit > 0 && (
                  <span className="mt-1 block text-sm text-ink/70">
                    {money(atVisit)} due at your appointment{a.depositStatus === "due" ? ", after your deposit" : ""} (cash, Cash App or Zelle).
                  </span>
                )}
              </dd>
            </div>
          </dl>
          {confirmed && (
            <div className="flex flex-col gap-2.5 border-t border-petal-line bg-blush/40 p-5 sm:flex-row sm:flex-wrap sm:p-6">
              <a className="btn-black px-5 py-3" href={googleCalendarLink(ev)} target="_blank" rel="noopener noreferrer">
                <IconCalendar size={17} /> Google Calendar
              </a>
              <a className="btn-outline px-5 py-3" href={`/api/bookings/${a.token}/ics`}>
                <IconCalendar size={17} /> Apple / Outlook
              </a>
            </div>
          )}
        </section>

        {confirmed && a.depositStatus === "due" && !stripeEnabled() && (
          <section aria-labelledby="deposit-title" data-reveal="scale" className="rounded-3xl bg-black p-6 text-[#fde7f5] shadow-[0_0_0_2px_var(--color-neon)] sm:p-7">
            <h2 id="deposit-title" className="flex items-center gap-2 text-xl font-semibold text-white">
              <Sparkle className="text-neon" size={14} /> One more step: your {money(a.depositCents)} deposit
            </h2>
            <p className="mt-2 leading-relaxed text-[#f3d6e8]">{settings.manualDepositInstructions}</p>
            {(settings.cashAppHandle || settings.zelleHandle) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {settings.cashAppHandle && <span className="rounded-full bg-white/10 px-4 py-2 font-semibold text-white">Cash App · {settings.cashAppHandle}</span>}
                {settings.zelleHandle && <span className="rounded-full bg-white/10 px-4 py-2 font-semibold text-white">Zelle · {settings.zelleHandle}</span>}
              </div>
            )}
          </section>
        )}

        {holdActive && stripeEnabled() && (
          <section className="rounded-3xl bg-white/80 p-6 text-center ring-1 ring-petal-line">
            <PayDepositButton token={a.token} label={`Pay ${money(a.depositCents)} deposit`} />
          </section>
        )}

        {confirmed && (
          <div data-reveal>
          <ManageBooking
            token={a.token}
            timezone={zone}
            canReschedule={resched.ok ? null : resched.reason}
            canCancel={cancel.ok ? null : cancel.reason}
            depositNote={a.depositStatus === "paid" ? "Your deposit is non-refundable." : ""}
          />
          </div>
        )}

        {confirmed && (guides.length > 0 || PREP_ALWAYS.length > 0) && (
          <section aria-labelledby="prep-title" data-reveal className="rounded-3xl bg-white/80 p-6 ring-1 ring-petal-line sm:p-7">
            <h2 id="prep-title" className="text-xl font-semibold">
              Get ready for your appointment
            </h2>
            <div className={`mt-4 grid gap-6 ${guides.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {guides.map((g) => (
                <div key={g.id}>
                  {guides.length > 1 && <p className="kicker mb-2 text-xs text-plum">{g.title}</p>}
                  <ul className="space-y-2.5">
                    {g.items.map((it) => (
                      <li key={it} className="flex gap-3 leading-snug">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-plum text-white">
                          <IconCheck size={12} strokeWidth={2.8} />
                        </span>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {PREP_ALWAYS.map((it) => (
                <span key={it} className="rounded-full bg-black px-3.5 py-1.5 text-white">
                  {it}
                </span>
              ))}
            </div>
          </section>
        )}

        {(confirmed || a.status === "pending") && (
          <details data-reveal className="group rounded-3xl bg-white/80 ring-1 ring-petal-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 text-lg font-semibold sm:px-7 [&::-webkit-details-marker]:hidden">
              Booking policies
              <IconChevronDown className="transition group-open:rotate-180" />
            </summary>
            <ul className="space-y-2.5 px-6 pb-6 text-[0.95rem] leading-relaxed sm:px-7">
              {settings.policies.map((p) => (
                <li key={p.title}>
                  <strong>{p.title}:</strong> {p.body}
                </li>
              ))}
            </ul>
          </details>
        )}

        {(inactive || a.status === "completed" || a.status === "no_show") && (
          <p className="pt-2 text-center">
            <a href="/#services" className="btn-black px-8 py-3.5">
              Book an appointment
            </a>
          </p>
        )}
      </main>

      {confirmed && (
        <section data-reveal="fade" className="on-dark bg-noir py-14 text-center text-[#fde7f5]">
          <p className="neon-text reveal-flicker font-script text-5xl sm:text-6xl">Thank you, babe</p>
          <p className="mx-auto mt-3 max-w-md px-4 text-[#f3d6e8]">{settings.confirmationNote}</p>
          {ig && (
            <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-6 px-6 py-3">
              <IconInstagram size={18} /> @{ig}
            </a>
          )}
        </section>
      )}

      <footer className={`py-8 text-center text-sm ${confirmed ? "on-dark border-t border-white/10 bg-noir text-[#e9c9de]" : "text-ink/70"}`}>
        Questions? {phone ? <a href={`sms:${phone}`} className="font-semibold underline-offset-4 hover:underline">Text {prettyPhone(phone)}</a> : null}
        {phone && settings.email ? " · " : ""}
        {settings.email && (
          <a href={`mailto:${settings.email}`} className="underline-offset-4 hover:underline">
            {settings.email}
          </a>
        )}
      </footer>
    </div>
  );
}
