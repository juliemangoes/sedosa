import type { Metadata } from "next";
import { DateTime } from "luxon";
import { desc, eq } from "drizzle-orm";
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
import { IconArrowRight, IconCalendar, IconCheck, IconClock, IconPin } from "@/components/landing/icons";
import Wordmark from "@/components/landing/Wordmark";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My account · Sedosa Beauty Studio", robots: { index: false } };

type Appt = typeof t.appointments.$inferSelect;

const STATUS: Record<Appt["status"], { label: string; cls: string }> = {
  pending: { label: "Awaiting deposit", cls: "text-[#7a4a00] ring-[#7a4a00]/40" },
  confirmed: { label: "Confirmed", cls: "text-[#1f6b4a] ring-[#1f6b4a]/40" },
  completed: { label: "Completed", cls: "text-ink-soft ring-line-strong" },
  no_show: { label: "Missed", cls: "text-[#a61b2b] ring-[#a61b2b]/40" },
  cancelled: { label: "Canceled", cls: "text-ink-soft ring-line-strong" },
  expired: { label: "Expired", cls: "text-ink-soft ring-line-strong" },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const db = await getDb();
  const [settings, me] = await Promise.all([getSettings(db), currentClient(db)]);
  const zone = settings.timezone;
  const enabled = accountsEnabled();

  const header = (
    <header className="on-rose bg-rose text-oxblood">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="rounded-lg" aria-label={`${settings.businessName} home`}>
          <Wordmark businessName={settings.businessName} />
        </a>
        <a href="/#services" className="btn-primary min-h-0 px-5 py-2.5">
          Book now
        </a>
      </div>
    </header>
  );

  if (!me) {
    return (
      <div className="min-h-screen">
        {header}
        <section className="on-rose lacquer pb-28 pt-12 text-center text-oxblood sm:pt-16">
          <h1 className="heading animate-rise px-4 text-[clamp(2.4rem,8vw,3.8rem)]">Your account</h1>
          <p className="mx-auto mt-4 max-w-md animate-rise px-4 text-lg [animation-delay:120ms]">Sign in with your email to see your appointments and book faster.</p>
        </section>
        <main className="relative mx-auto -mt-20 grid max-w-5xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_20rem]">
          <section aria-label="Sign in" className="animate-rise rounded-[2rem] bg-panel p-1.5 shadow-[0_30px_60px_-30px_rgba(58,15,28,0.65)] [animation-delay:200ms]">
            <div className="rounded-[1.6rem] p-6 ring-1 ring-brass sm:p-8">
            <h2 className="heading text-[1.75rem]">Sign in or create your account</h2>
            {sp.error === "link" && (
              <p role="alert" className="mt-3 rounded-2xl bg-panel px-4 py-2.5 text-sm font-medium text-[#a61b2b] ring-1 ring-[#a61b2b]/50">
                That sign-in link has expired or was already used. Request a new code below.
              </p>
            )}
            <div className="mt-5">
              {enabled ? (
                <AccountSignIn initialEmail={sp.email} />
              ) : (
                <p className="rounded-2xl bg-plaster px-4 py-3">Accounts are coming soon. Your confirmation email has a link to manage each booking.</p>
              )}
            </div>
            </div>
          </section>
          <aside className="space-y-5 lg:pt-24">
            {[
              ["All your appointments in one place", "Upcoming and past visits, with reschedule and cancel a tap away."],
              ["Faster booking", "Your details, and your answers from last time, are filled in for you."],
              ["Book again in seconds", "Rebook your favorite service straight from your history."],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3 border-b border-line pb-5 last:border-0">
                <IconCheck size={18} strokeWidth={2} className="mt-1 shrink-0 text-lacquer" />
                <div>
                  <p className="font-display text-[1.25rem] font-medium leading-snug">{title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{body}</p>
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
      <section className="on-rose lacquer pb-28 pt-12 text-oxblood sm:pt-16">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 px-4 sm:px-6">
          <div>
            <h1 className="heading animate-rise text-[clamp(2.4rem,8vw,3.8rem)]">Hi{me.firstName ? `, ${me.firstName}` : ""}</h1>
            <p className="mt-3 animate-rise text-lg [animation-delay:120ms]">
              {sp.welcome ? "You're signed in. " : ""}
              {upcoming.length ? `You have ${upcoming.length} upcoming appointment${upcoming.length === 1 ? "" : "s"}.` : "No upcoming appointments yet."}
            </p>
          </div>
          <SignOutButton className="btn-secondary min-h-0 px-5 py-2.5" />
        </div>
      </section>

      <main className="relative mx-auto -mt-20 max-w-5xl space-y-10 px-4 pb-20 sm:px-6">
        <section aria-labelledby="upcoming-title" className="animate-rise [animation-delay:220ms]">
          <h2 id="upcoming-title" className="sr-only">
            Upcoming appointments
          </h2>
          {upcoming.length === 0 ? (
            <div className="rounded-[2rem] bg-panel p-8 text-center shadow-[0_30px_60px_-30px_rgba(58,15,28,0.65)] ring-1 ring-line">
              <p className="font-display text-[1.75rem] font-medium">Nothing booked yet</p>
              <p className="mt-2 text-ink-soft">Pick a service and a time that works for you.</p>
              <a href="/#services" className="btn-primary mt-6">
                Book an appointment <IconArrowRight size={16} />
              </a>
            </div>
          ) : (
            <ul className="space-y-4">
              {upcoming.map((a) => {
                const start = DateTime.fromJSDate(a.startsAt).setZone(zone);
                const end = DateTime.fromJSDate(a.endsAt).setZone(zone);
                return (
                  <li key={a.id} className="overflow-hidden rounded-[2rem] bg-panel shadow-[0_30px_60px_-30px_rgba(58,15,28,0.6)] ring-1 ring-line">
                    <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
                      <div className="w-20 text-center sm:border-r sm:border-line sm:pr-5">
                        <span className="caps block text-ink-soft">{start.toFormat("LLL")}</span>
                        <span className="font-display block text-[2.6rem] font-medium leading-none tabular-nums">{start.day}</span>
                        <span className="mt-0.5 block text-xs text-ink-soft">{start.toFormat("ccc")}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-[1.35rem] font-medium leading-snug">{prettyName(a.snapshot.serviceName)}</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
                          {a.depositStatus === "due" && a.status === "confirmed" && (
                            <span className="rounded-full px-2.5 py-0.5 text-xs text-[#7a4a00] ring-1 ring-[#7a4a00]/40">Deposit due</span>
                          )}
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                          <span className="inline-flex items-center gap-1.5">
                            <IconClock size={14} /> {start.toFormat("h:mm")} – {end.toFormat("h:mm a")}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <IconPin size={14} /> {a.snapshot.locationName}
                          </span>
                          <span>{money(a.priceCents)}</span>
                        </p>
                        {a.snapshot.addons.length > 0 && <p className="mt-0.5 text-sm text-ink-soft">+ {a.snapshot.addons.map((x) => x.name).join(", ")}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <a href={`/booking/${a.token}`} className="btn-primary min-h-0 px-5 py-2.5">
                          Manage
                        </a>
                        {a.status === "confirmed" && (
                          <a href={googleCalendarLink(appointmentEvent(a, settings, base))} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-0 px-4 py-2.5" aria-label="Add to Google Calendar">
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
                        className="flex items-center gap-2 border-t border-line bg-plaster px-5 py-3 text-sm font-medium text-lacquer hover:bg-plaster-2 sm:px-6"
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
          <section aria-labelledby="past-title">
            <h2 id="past-title" className="heading text-[1.75rem]">
              Past appointments
            </h2>
            {past.length === 0 ? (
              <p className="mt-4 border-t border-oxblood pt-4 text-ink-soft">Your visit history will show up here.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line border-y border-oxblood">
                {past.map((a) => {
                  const start = DateTime.fromJSDate(a.startsAt).setZone(zone);
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{prettyName(a.snapshot.serviceName)}</p>
                        <p className="text-sm text-ink-soft">
                          {start.toFormat("ccc, LLL d, yyyy")} · {shortDuration(Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60000))}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
                      <a href={`/?service=${a.serviceId}`} className="btn-secondary min-h-0 px-4 py-2">
                        Book again
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="profile-title" className="h-fit rounded-[1.75rem] bg-panel p-6 ring-1 ring-line">
            <h2 id="profile-title" className="heading text-[1.75rem]">
              My details
            </h2>
            <div className="mt-4">
              <ProfileForm profile={profile} incomplete={incomplete} whatsapp={settings.whatsappReminders} />
            </div>
          </section>
        </div>

        <p className="text-center text-sm text-ink-soft">
          Questions? {phone && <a href={`sms:${phone}`} className="font-medium underline-offset-4 hover:underline">Text {prettyPhone(phone)}</a>}
        </p>
      </main>
    </div>
  );
}
