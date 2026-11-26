import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import { clientCanChange, findByToken } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import { appUrl, stripeEnabled } from "@/lib/env";
import { money, normalizePhone, prettyPhone } from "@/lib/format";
import { prettyName, shortDuration } from "@/lib/display";
import { googleCalendarLink } from "@/lib/ics";
import { appointmentEvent } from "@/lib/notify";
import { syncCheckoutSession } from "@/lib/stripe";
import { accountsEnabled, currentClient } from "@/lib/client-session";
import { PREP_ALWAYS, guidesFor } from "@/content/prep";
import ManageBooking from "@/components/booking/ManageBooking";
import PayDepositButton from "@/components/booking/PayDepositButton";
import { IconCalendar, IconCheck, IconChevronDown, IconClock, IconInstagram, IconPin } from "@/components/landing/icons";
import Wordmark from "@/components/landing/Wordmark";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your appointment · Sedosa Beauty Studio", robots: { index: false } };

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
  const [settings, me] = await Promise.all([getSettings(db), currentClient(db)]);
  const signedInHere = !!me && me.id === client.id;
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
        title: isNew ? `You're booked, ${client.firstName}!` : `See you soon, ${client.firstName}`,
        sub: `Your confirmation was sent to ${maskEmail(client.email)}.`,
      }
    : a.status === "pending" && holdActive
      ? { title: "Pay your deposit to confirm", sub: `Your time is held until ${DateTime.fromJSDate(a.holdExpiresAt!).setZone(zone).toFormat("h:mm a")}.` }
      : a.status === "cancelled"
        ? { title: "This appointment was canceled", sub: "We hope to see you another time." }
        : a.status === "expired" || a.status === "pending"
          ? { title: "This booking expired", sub: "The deposit wasn't paid in time, so the slot was released." }
          : a.status === "completed"
            ? { title: `Thanks for visiting, ${client.firstName}!`, sub: "Ready for your next appointment?" }
            : { title: "We missed you", sub: "Book a new time whenever you're ready." };
  const panel = "rounded-[1.75rem] bg-panel p-6 ring-1 ring-line sm:p-8";

  return (
    <div className="min-h-screen">
      <header className="on-rose bg-rose text-oxblood">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="rounded-lg" aria-label={`${settings.businessName} home`}>
            <Wordmark businessName={settings.businessName} />
          </a>
          <a href="/#services" className="btn-secondary min-h-0 px-4 py-2.5">
            Book another
          </a>
        </div>
      </header>

      <section className="on-rose lacquer pb-28 pt-12 text-center text-oxblood sm:pt-16">
        <div className="mx-auto max-w-2xl px-4">
          <h1 className="font-display animate-rise text-[clamp(2.4rem,8vw,3.8rem)] font-medium leading-[1.02]">{status.title}</h1>
          <p className="mt-4 animate-rise text-lg [animation-delay:120ms]">{status.sub}</p>
          {sp.canceled && holdActive && <p className="mt-2">Payment was canceled. You can try again below.</p>}
        </div>
      </section>

      <main className="relative mx-auto -mt-20 max-w-3xl space-y-6 px-4 pb-20 sm:px-6">
        {/* The reservation card */}
        <section aria-label="Appointment details" className="relative animate-rise overflow-hidden rounded-[2rem] bg-panel p-1.5 shadow-[0_30px_60px_-30px_rgba(58,15,28,0.65)] [animation-delay:200ms]">
          {celebrate && <span aria-hidden="true" className="mirror-sheen animate-sheen [animation-delay:700ms] [animation-duration:1.8s]" />}
          <div className="rounded-[1.6rem] ring-1 ring-brass">
            <div className={`grid gap-5 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8 sm:p-8 ${inactive ? "opacity-60" : ""}`}>
              <div className="mx-auto text-center sm:mx-0 sm:border-r sm:border-line sm:pr-8">
                <span className="caps block text-ink-soft">{start.toFormat("LLLL")}</span>
                <span className="font-display block text-[4.5rem] font-medium leading-[0.9] tabular-nums">{start.day}</span>
                <span className="mt-1 block text-sm text-ink-soft">{start.toFormat("cccc")}</span>
              </div>
              <div className="text-center sm:text-left">
                <p data-testid="appt-when" className={`font-display text-[2.2rem] font-medium leading-tight tabular-nums ${inactive ? "line-through" : ""}`}>
                  {start.toFormat("h:mm")} – {end.toFormat("h:mm a")}
                </p>
                <p className="mt-1 text-ink-soft">{start.toFormat("cccc, LLLL d, yyyy")}</p>
              </div>
            </div>
            <dl className="grid gap-x-8 gap-y-5 border-t border-line p-6 sm:grid-cols-2 sm:p-8">
              <div>
                <dt className="caps text-ink-soft">Service</dt>
                <dd className="mt-1.5">
                  <span className="font-medium">{prettyName(s.serviceName)}</span>
                  <span className="flex items-center gap-1.5 text-sm text-ink-soft">
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
                <dt className="caps text-ink-soft">Studio</dt>
                <dd className="mt-1.5">
                  <span className="font-medium">{s.locationName}</span>
                  {confirmed && s.locationAddress ? (
                    <>
                      <span className="block text-sm">{s.locationAddress}</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.locationAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-lacquer underline-offset-4 hover:underline"
                      >
                        <IconPin size={14} /> Get directions
                      </a>
                    </>
                  ) : (
                    <span className="block text-sm text-ink-soft">{settings.locationNote}</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="caps text-ink-soft">Price</dt>
                <dd className="mt-1.5">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-display text-[1.75rem] font-medium leading-none tabular-nums">{money(a.priceCents)}</span>
                    {a.depositCents > 0 && (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ring-1 ${a.depositStatus === "paid" ? "text-[#1f6b4a] ring-[#1f6b4a]/40" : a.depositStatus === "waived" ? "ring-line-strong" : "text-[#7a4a00] ring-[#7a4a00]/40"}`}
                      >
                        {a.depositStatus === "paid" && <IconCheck size={14} strokeWidth={2.4} />}
                        {a.depositStatus === "paid" ? `Deposit ${money(a.depositCents)} paid` : a.depositStatus === "waived" ? "Deposit waived" : `Deposit ${money(a.depositCents)} not paid yet`}
                      </span>
                    )}
                  </span>
                  {confirmed && atVisit > 0 && (
                    <span className="mt-2 block text-sm text-ink-soft">
                      {money(atVisit)} due at your appointment{a.depositStatus === "due" ? ", after your deposit" : ""} (cash, Cash App or Zelle).
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            {confirmed && (
              <div className="flex flex-col gap-2.5 border-t border-line p-5 sm:flex-row sm:flex-wrap sm:p-6">
                <a className="btn-primary" href={googleCalendarLink(ev)} target="_blank" rel="noopener noreferrer">
                  <IconCalendar size={17} /> Google Calendar
                </a>
                <a className="btn-secondary" href={`/api/bookings/${a.token}/ics`}>
                  <IconCalendar size={17} /> Apple / Outlook
                </a>
              </div>
            )}
          </div>
        </section>

        {confirmed && a.depositStatus === "due" && !stripeEnabled() && (
          <section aria-labelledby="deposit-title" className="on-dark rounded-[1.75rem] bg-oxblood p-6 text-plaster sm:p-8">
            <h2 id="deposit-title" className="font-display text-[1.75rem] font-medium leading-tight">
              One more step: your {money(a.depositCents)} deposit
            </h2>
            <p className="mt-3 leading-relaxed">{settings.manualDepositInstructions}</p>
            {(settings.cashAppHandle || settings.zelleHandle) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {settings.cashAppHandle && <span className="rounded-full px-4 py-2 font-medium text-brass-light ring-1 ring-brass-light/60">Cash App · {settings.cashAppHandle}</span>}
                {settings.zelleHandle && <span className="rounded-full px-4 py-2 font-medium text-brass-light ring-1 ring-brass-light/60">Zelle · {settings.zelleHandle}</span>}
              </div>
            )}
          </section>
        )}

        {holdActive && stripeEnabled() && (
          <section className={`${panel} text-center`}>
            <PayDepositButton token={a.token} label={`Pay ${money(a.depositCents)} deposit`} />
          </section>
        )}

        {confirmed && (
          <ManageBooking
            token={a.token}
            timezone={zone}
            canReschedule={resched.ok ? null : resched.reason}
            canCancel={cancel.ok ? null : cancel.reason}
            depositNote={a.depositStatus === "paid" ? "Your deposit is non-refundable." : ""}
          />
        )}

        {confirmed && (guides.length > 0 || PREP_ALWAYS.length > 0) && (
          <section aria-labelledby="prep-title" className={panel}>
            <h2 id="prep-title" className="font-display text-[1.75rem] font-medium leading-tight">
              Get ready for your appointment
            </h2>
            <div className={`mt-5 grid gap-8 ${guides.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {guides.map((g) => (
                <div key={g.id}>
                  {guides.length > 1 && <h3 className="font-display mb-3 border-b border-line pb-2 text-xl font-medium">{g.title}</h3>}
                  <ul className="space-y-3">
                    {g.items.map((it) => (
                      <li key={it} className="flex gap-3 leading-snug">
                        <IconCheck size={17} strokeWidth={2} className="mt-0.5 shrink-0 text-lacquer" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {PREP_ALWAYS.length > 0 && (
              <p className="mt-6 border-t border-line pt-4 text-[0.95rem]">
                <span className="font-medium">For every appointment: </span>
                {PREP_ALWAYS.join(" · ")}
              </p>
            )}
          </section>
        )}

        {confirmed && (signedInHere || accountsEnabled()) && (
          <section className="flex flex-col items-start gap-5 rounded-[1.75rem] bg-plaster-2 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="font-display text-[1.5rem] font-medium leading-tight">{signedInHere ? "It's in your account" : "Keep all your bookings in one place"}</h2>
              <p className="mt-1.5 text-ink-soft">
                {signedInHere ? "See every upcoming and past visit, and book again in a tap." : "Create a free account with this email: no password, and booking next time is quicker."}
              </p>
            </div>
            <a href={signedInHere ? "/account" : `/account?email=${encodeURIComponent(client.email)}`} className="btn-primary shrink-0">
              {signedInHere ? "My appointments" : "Create my account"}
            </a>
          </section>
        )}

        {(confirmed || a.status === "pending") && (
          <details className="group rounded-[1.75rem] bg-panel ring-1 ring-line">
            <summary className="font-display flex cursor-pointer list-none items-center justify-between gap-3 p-6 text-[1.5rem] font-medium sm:px-8 [&::-webkit-details-marker]:hidden">
              Booking policies
              <IconChevronDown className="transition group-open:rotate-180" />
            </summary>
            <dl className="divide-y divide-line px-6 pb-4 text-[0.95rem] leading-relaxed sm:px-8">
              {settings.policies.map((p) => (
                <div key={p.title} className="py-3">
                  <dt className="font-medium">{p.title}</dt>
                  <dd className="mt-0.5">{p.body}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        {(inactive || a.status === "completed" || a.status === "no_show") && (
          <p className="pt-2 text-center">
            <a href="/#services" className="btn-primary px-8">
              Book an appointment
            </a>
          </p>
        )}
      </main>

      {confirmed && (
        <section className="on-dark bg-oxblood px-4 py-16 text-center text-plaster">
          <p className="font-display text-[clamp(2.4rem,7vw,3.6rem)] font-medium leading-none">Thank you</p>
          <p className="mx-auto mt-4 max-w-md">{settings.confirmationNote}</p>
          {ig && (
            <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className="btn-ghost-light mt-7">
              <IconInstagram size={18} /> @{ig}
            </a>
          )}
        </section>
      )}

      <footer className={`py-8 text-center text-sm ${confirmed ? "on-dark border-t border-brass/40 bg-oxblood text-plaster" : "text-ink-soft"}`}>
        Questions? {phone ? <a href={`sms:${phone}`} className="font-medium underline-offset-4 hover:underline">Text {prettyPhone(phone)}</a> : null}
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
