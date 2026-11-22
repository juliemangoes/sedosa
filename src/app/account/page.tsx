import Image from "next/image";
import type { Metadata } from "next";
import { DateTime } from "luxon";
import { desc, eq } from "drizzle-orm";
import logo from "@/assets/brand/logo.png";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { accountsEnabled, currentClient } from "@/lib/client-session";
import { profileOf } from "@/lib/account";
import { prettyName, shortDuration } from "@/lib/display";
import { money, normalizePhone, prettyPhone } from "@/lib/format";
import { googleCalendarLink } from "@/lib/ics";
import { appointmentEvent } from "@/lib/notify";
import { appUrl } from "@/lib/env";
import { AccountSignIn, ProfileForm, SignOutButton } from "@/components/account/AccountClient";
import { IconArrowRight, IconCalendar, IconCheck, IconClock, IconHeart, IconPin, Sparkle } from "@/components/landing/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My account · Sedosa Beauty Studio", robots: { index: false } };

type Appt = typeof t.appointments.$inferSelect;

const STATUS: Record<Appt["status"], { label: string; cls: string }> = {
  pending: { label: "Awaiting deposit", cls: "bg-amber-50 text-amber-900 ring-amber-200" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-50 text-emerald-900 ring-emerald-200" },
  completed: { label: "Completed", cls: "bg-white text-ink/80 ring-petal-line" },
  no_show: { label: "Missed", cls: "bg-red-50 text-red-900 ring-red-200" },
  cancelled: { label: "Canceled", cls: "bg-white text-ink/70 ring-petal-line" },
  expired: { label: "Expired", cls: "bg-white text-ink/70 ring-petal-line" },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const db = await getDb();
  const [settings, me] = await Promise.all([getSettings(db), currentClient(db)]);
  const zone = settings.timezone;
  const enabled = accountsEnabled();

  const header = (
    <header className="on-dark bg-noir">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex items-center rounded-lg" aria-label={`${settings.businessName} home`}>
          <Image src={logo} alt="" sizes="120px" className="h-10 w-auto" />
        </a>
        <a href="/#services" className="btn-neon px-5 py-2.5">
          Book now
        </a>
      </div>
    </header>
  );

  if (!me) {
    return (
      <div className="min-h-screen">
        {header}
        <section className="on-dark relative isolate overflow-hidden bg-noir pb-24 pt-10 text-center text-[#fde7f5]">
          <div aria-hidden="true" className="absolute left-1/2 top-0 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-neon/25 blur-[110px]" />
          <p className="kicker animate-rise text-sm text-neon-soft">Your account</p>
          <h1 className="mt-2 animate-rise px-4 text-3xl font-semibold text-white [animation-delay:80ms] sm:text-4xl">Welcome, babe ♡</h1>
          <p className="mx-auto mt-2 max-w-md animate-rise px-4 text-[#f3d6e8] [animation-delay:160ms]">Sign in with your email to see your appointments and book faster.</p>
        </section>
        <main className="relative mx-auto -mt-14 grid max-w-5xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_20rem]">
          <section aria-label="Sign in" className="animate-rise rounded-3xl bg-white p-6 shadow-[0_24px_60px_-30px_rgba(109,43,103,0.55)] ring-1 ring-petal-line [animation-delay:220ms] sm:p-8">
            <h2 className="text-xl font-semibold">Sign in or create your account</h2>
            {sp.error === "link" && (
              <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-900 ring-1 ring-red-200">
                That sign-in link has expired or was already used. Request a new code below.
              </p>
            )}
            <div className="mt-5">
              {enabled ? (
                <AccountSignIn initialEmail={sp.email} />
              ) : (
                <p className="rounded-2xl bg-blush px-4 py-3">Accounts are coming soon. Your confirmation email has a link to manage each booking.</p>
              )}
            </div>
          </section>
          <aside className="animate-rise space-y-3 [animation-delay:300ms] lg:pt-4">
            {[
              ["All your appointments in one place", "Upcoming and past visits, with reschedule and cancel a tap away."],
              ["Faster booking", "Your details, and your answers from last time, are filled in for you."],
              ["Book again in seconds", "Rebook your favorite service straight from your history."],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3 rounded-3xl bg-white/70 p-4 ring-1 ring-petal-line">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black text-neon">
                  <IconCheck size={15} strokeWidth={2.4} />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-ink/75">{body}</p>
                </div>
              </div>
            ))}
          </aside>
        </main>
      </div>
    );
  }

  const appts = await db.select().from(t.appointments).where(eq(t.appointments.clientId, me.id)).orderBy(desc(t.appointments.startsAt));
  const now = new Date();
  const upcoming = appts.filter((a) => a.startsAt >= now && (a.status === "confirmed" || a.status === "pending")).reverse();
  const past = appts.filter((a) => !upcoming.includes(a)).slice(0, 20);
  const profile = profileOf(me);
  const incomplete = !me.firstName || !me.lastName;
  const base = appUrl();
  const phone = normalizePhone(settings.phone);

  return (
    <div className="min-h-screen">
      {header}
      <section className="on-dark relative isolate overflow-hidden bg-noir pb-24 pt-10 text-[#fde7f5]">
        <div aria-hidden="true" className="absolute -left-20 top-0 -z-10 size-[26rem] rounded-full bg-neon/20 blur-[110px]" />
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 px-4 sm:px-6">
          <div>
            <p className="kicker animate-rise text-sm text-neon-soft">{sp.welcome ? "You're signed in ♡" : "My account"}</p>
            <h1 className="mt-2 animate-rise text-3xl font-semibold text-white [animation-delay:80ms] sm:text-4xl">Hi{me.firstName ? `, ${me.firstName}` : ""} ♡</h1>
            <p className="mt-1 animate-rise text-[#f3d6e8] [animation-delay:160ms]">
              {upcoming.length ? `You have ${upcoming.length} upcoming appointment${upcoming.length === 1 ? "" : "s"}.` : "No upcoming appointments yet."}
            </p>
          </div>
          <SignOutButton className="btn-ghost animate-rise px-5 py-2.5 [animation-delay:200ms]" />
        </div>
      </section>

      <main className="relative mx-auto -mt-14 max-w-5xl space-y-8 px-4 pb-16 sm:px-6">
        <section aria-labelledby="upcoming-title" className="animate-rise [animation-delay:220ms]">
          <h2 id="upcoming-title" className="sr-only">
            Upcoming appointments
          </h2>
          {upcoming.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-[0_24px_60px_-30px_rgba(109,43,103,0.55)] ring-1 ring-petal-line">
              <Sparkle className="mx-auto text-neon" size={22} />
              <p className="mt-2 text-xl font-semibold">Ready for your next glow-up?</p>
              <p className="mt-1 text-ink/70">Pick a service and a time that works for you.</p>
              <a href="/#services" className="btn-black mt-5 px-7 py-3.5">
                Book an appointment <IconArrowRight size={16} />
              </a>
            </div>
          ) : (
            <ul className="space-y-4">
              {upcoming.map((a) => {
                const start = DateTime.fromJSDate(a.startsAt).setZone(zone);
                const end = DateTime.fromJSDate(a.endsAt).setZone(zone);
                return (
                  <li key={a.id} className="overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-30px_rgba(109,43,103,0.55)] ring-1 ring-petal-line">
                    <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
                      <div className="grid w-20 place-items-center rounded-2xl bg-black py-2.5 text-center text-white">
                        <span className="kicker text-[0.65rem] text-neon-soft">{start.toFormat("LLL")}</span>
                        <span className="text-3xl font-semibold leading-none">{start.day}</span>
                        <span className="mt-0.5 text-[0.7rem] text-white/70">{start.toFormat("ccc")}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold">{prettyName(a.snapshot.serviceName)}</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
                          {a.depositStatus === "due" && a.status === "confirmed" && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-900 ring-1 ring-amber-200">Deposit due</span>
                          )}
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/75">
                          <span className="inline-flex items-center gap-1.5">
                            <IconClock size={14} /> {start.toFormat("h:mm")} – {end.toFormat("h:mm a")}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <IconPin size={14} /> {a.snapshot.locationName}
                          </span>
                          <span>{money(a.priceCents)}</span>
                        </p>
                        {a.snapshot.addons.length > 0 && <p className="mt-0.5 text-sm text-ink/70">+ {a.snapshot.addons.map((x) => x.name).join(", ")}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <a href={`/booking/${a.token}`} className="btn-black px-5 py-2.5">
                          Manage
                        </a>
                        {a.status === "confirmed" && (
                          <a href={googleCalendarLink(appointmentEvent(a, settings, base))} target="_blank" rel="noopener noreferrer" className="btn-outline px-4 py-2.5" aria-label="Add to Google Calendar">
                            <IconCalendar size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                    {a.status === "confirmed" && a.snapshot.locationAddress && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.snapshot.locationAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 border-t border-petal-line bg-blush/40 px-5 py-3 text-sm font-medium text-plum hover:bg-blush sm:px-6"
                      >
                        <IconPin size={15} /> {a.snapshot.locationAddress} · Directions
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <section aria-labelledby="past-title" data-reveal>
            <h2 id="past-title" className="text-xl font-semibold">
              Past appointments
            </h2>
            {past.length === 0 ? (
              <p className="mt-3 rounded-3xl bg-white/70 p-5 text-ink/70 ring-1 ring-petal-line">Your visit history will show up here.</p>
            ) : (
              <ul className="mt-3 divide-y divide-petal-line/70 overflow-hidden rounded-3xl bg-white/80 ring-1 ring-petal-line">
                {past.map((a) => {
                  const start = DateTime.fromJSDate(a.startsAt).setZone(zone);
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{prettyName(a.snapshot.serviceName)}</p>
                        <p className="text-sm text-ink/70">
                          {start.toFormat("ccc, LLL d, yyyy")} · {shortDuration(Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60000))}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
                      <a href={`/?service=${a.serviceId}`} className="btn-outline px-4 py-2">
                        Book again
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="profile-title" data-reveal className="h-fit rounded-3xl bg-white/80 p-5 ring-1 ring-petal-line sm:p-6">
            <h2 id="profile-title" className="flex items-center gap-2 text-xl font-semibold">
              <IconHeart className="text-plum" /> My details
            </h2>
            <div className="mt-4">
              <ProfileForm profile={profile} incomplete={incomplete} whatsapp={settings.whatsappReminders} />
            </div>
          </section>
        </div>

        <p className="text-center text-sm text-ink/70">
          Questions? {phone && <a href={`sms:${phone}`} className="font-semibold underline-offset-4 hover:underline">Text {prettyPhone(phone)}</a>}
        </p>
      </main>
    </div>
  );
}
