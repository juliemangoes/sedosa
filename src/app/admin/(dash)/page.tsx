import Link from "next/link";
import { headers } from "next/headers";
import { DateTime } from "luxon";
import { and, asc, eq, gte, inArray, like, lt } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { money, prettyPhone } from "@/lib/format";
import { prettyName } from "@/lib/display";
import { appUrl } from "@/lib/env";
import { ledger, resolvePeriod, summarize } from "@/lib/finance";
import { dispatchDueReminders, dueReminders, renderTemplate, templateContext, waLink, whatsappApiConfigured } from "@/lib/whatsapp";
import { markReminderSentAction } from "../actions";
import { SendReminderButton } from "@/components/admin/WhatsAppButtons";
import { AIBell, AICalendar, AIClock, AIExternal, AIPhone, AIPlus, AIWallet, WhatsAppIcon } from "@/components/admin/icons";
import { Avatar, Card, DepositBadge, Empty, Flash, Stat, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const settings = await getSettings(db);
  const zone = settings.timezone;
  const h = await headers();
  const base = process.env.APP_URL ? appUrl() : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const now = DateTime.now().setZone(zone);

  // With WhatsApp connected, anything due goes out now; otherwise it waits below for a one-tap send.
  if (whatsappApiConfigured()) await dispatchDueReminders(db, settings, base);

  const weekStart = now.startOf("week");
  const active: t.AppointmentStatus[] = ["confirmed", "pending", "completed", "no_show"];
  const [week, due, attention, flagged, monthEntries] = await Promise.all([
    db
      .select({ a: t.appointments, c: t.clients })
      .from(t.appointments)
      .innerJoin(t.clients, eq(t.clients.id, t.appointments.clientId))
      .where(and(gte(t.appointments.startsAt, weekStart.toJSDate()), lt(t.appointments.startsAt, weekStart.plus({ weeks: 1 }).toJSDate()), inArray(t.appointments.status, active)))
      .orderBy(asc(t.appointments.startsAt)),
    dueReminders(db),
    db
      .select({ a: t.appointments, c: t.clients })
      .from(t.appointments)
      .innerJoin(t.clients, eq(t.clients.id, t.appointments.clientId))
      .where(and(gte(t.appointments.startsAt, now.minus({ days: 1 }).toJSDate()), eq(t.appointments.status, "confirmed"), eq(t.appointments.depositStatus, "due")))
      .orderBy(asc(t.appointments.startsAt))
      .limit(12),
    db
      .select({ a: t.appointments, c: t.clients })
      .from(t.appointments)
      .innerJoin(t.clients, eq(t.clients.id, t.appointments.clientId))
      .where(and(gte(t.appointments.startsAt, now.toJSDate()), like(t.appointments.adminNotes, "%⚠️%"), eq(t.appointments.status, "confirmed")))
      .limit(6),
    (async () => {
      const p = resolvePeriod(zone, "this-month");
      return summarize(await ledger(db, zone, p.from, p.to));
    })(),
  ]);

  const today = week.filter(({ a }) => DateTime.fromJSDate(a.startsAt).setZone(zone).hasSame(now, "day"));
  const next = week.find(({ a }) => a.endsAt > now.toJSDate() && (a.status === "confirmed" || a.status === "pending"));
  const weekBooked = week.filter(({ a }) => a.status !== "no_show");
  const weekValue = weekBooked.reduce((n, { a }) => n + a.priceCents, 0);
  const greeting = now.hour < 12 ? "Good morning" : now.hour < 17 ? "Good afternoon" : "Good evening";
  const fmt = (d: Date, f: string) => DateTime.fromJSDate(d).setZone(zone).toFormat(f);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">{now.toFormat("cccc, LLLL d")}</p>
          <h1 className="font-display text-[2.3rem] font-medium leading-[1.05]">{greeting}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/appointments/new" className="inline-flex items-center gap-2 rounded-xl bg-oxblood px-4 py-2.5 text-sm font-medium text-panel shadow-sm hover:bg-[#5b2256]">
            <AIPlus size={17} /> New appointment
          </Link>
          <Link href="/admin/calendar" className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-panel px-4 py-2.5 text-sm font-medium hover:bg-plaster">
            <AICalendar size={17} /> Calendar
          </Link>
        </div>
      </div>
      <Flash sp={sp} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Today" value={`${today.length} appt${today.length === 1 ? "" : "s"}`} icon={<AIClock size={14} />} hint={next ? `Next at ${fmt(next.a.startsAt, "h:mm a")}` : "Nothing else today"} />
        <Stat label="This week" value={money(weekValue)} icon={<AICalendar size={14} />} hint={`${weekBooked.length} booked`} />
        <Stat label="Profit this month" value={money(monthEntries.netCents)} tone="brand" icon={<AIWallet size={14} />} hint={`${money(monthEntries.incomeCents)} in · ${money(monthEntries.expenseCents)} out`} />
        <Stat label="Deposits due" value={String(attention.length)} tone={attention.length ? "bad" : "default"} icon={<AIBell size={14} />} hint={attention.length ? money(attention.reduce((n, { a }) => n + a.depositCents, 0)) + " to collect" : "All caught up"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {next && (
            <section aria-labelledby="next-up-title" className="on-dark relative overflow-hidden rounded-[1.25rem] bg-oxblood p-5 text-plaster shadow-[0_20px_40px_-24px_rgba(58,15,28,0.8)] sm:p-6">
              <h2 id="next-up-title" className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-display text-xl font-medium">Next up</span>
                <span className="text-brass-light">{DateTime.fromJSDate(next.a.startsAt).setZone(zone).toRelative({ base: now })}</span>
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Avatar first={next.c.firstName} last={next.c.lastName} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[1.75rem] font-medium leading-tight">
                    {next.c.firstName} {next.c.lastName}
                  </p>
                  <p className="mt-0.5 text-sm">
                    {prettyName(next.a.snapshot.serviceName)} · {fmt(next.a.startsAt, "ccc h:mm")}–{fmt(next.a.endsAt, "h:mm a")} · {next.a.snapshot.locationName}
                  </p>
                </div>
              </div>
              <div className="relative mt-4 flex flex-wrap gap-2">
                <Link href={`/admin/appointments/${next.a.id}`} className="rounded-full bg-rose px-4 py-2 text-sm font-medium text-oxblood hover:bg-rose-hi">
                  Open
                </Link>
                {next.c.phone && (
                  <a href={`tel:${next.c.phone}`} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm ring-1 ring-plaster/50 hover:bg-oxblood-2">
                    <AIPhone size={16} /> Call
                  </a>
                )}
                {waLink(next.c.phone) && (
                  <a
                    href={waLink(next.c.phone, renderTemplate(settings.whatsappTemplates[1]?.body ?? settings.whatsappReminderTemplate, templateContext(next.a, next.c, settings, base)))!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#075e54] px-4 py-2 text-sm text-white hover:bg-[#054c44]"
                  >
                    <WhatsAppIcon size={16} /> WhatsApp
                  </a>
                )}
              </div>
            </section>
          )}

          <Card title="Today" subtitle={now.toFormat("cccc, LLL d")} actions={<Link href="/admin/calendar" className="text-sm font-medium text-lacquer hover:underline">Full calendar</Link>}>
            {today.length === 0 ? (
              <Empty icon={<AICalendar size={20} />}>No appointments today.</Empty>
            ) : (
              <ol className="relative space-y-1 border-l border-line pl-5">
                {today.map(({ a, c }) => {
                  const past = a.endsAt < now.toJSDate();
                  return (
                    <li key={a.id} className={`relative ${past ? "opacity-60" : ""}`}>
                      <span aria-hidden="true" className={`absolute -left-[1.6rem] top-4 size-2.5 rounded-full ring-4 ring-panel ${a.status === "confirmed" ? "bg-lacquer" : a.status === "pending" ? "bg-[#c9932f]" : "bg-line-strong"}`} />
                      <div className="flex flex-wrap items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-plaster">
                        <span className="w-20 text-sm font-semibold tabular-nums">{fmt(a.startsAt, "h:mm a")}</span>
                        <Link href={`/admin/appointments/${a.id}`} className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="block truncate text-sm text-ink-soft">
                            {prettyName(a.snapshot.serviceName)} · {a.snapshot.locationName}
                          </span>
                        </Link>
                        <span className="flex items-center gap-1.5">
                          <StatusBadge status={a.status} />
                          <DepositBadge status={a.depositStatus} cents={a.depositCents} />
                        </span>
                        <span className="flex gap-1">
                          {c.phone && (
                            <a href={`tel:${c.phone}`} aria-label={`Call ${c.firstName}`} className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-plaster-2 hover:text-ink">
                              <AIPhone size={16} />
                            </a>
                          )}
                          {waLink(c.phone) && (
                            <a href={waLink(c.phone)!} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.firstName}`} className="grid size-8 place-items-center rounded-full text-[#075e54] hover:bg-[#e3f1ea]">
                              <WhatsAppIcon size={17} />
                            </a>
                          )}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="WhatsApp reminders to send"
            subtitle={whatsappApiConfigured() ? "Sending automatically through WhatsApp" : "Tap Send: WhatsApp opens with the message ready"}
            actions={<WhatsAppIcon size={20} className="text-[#075e54]" />}
          >
            {due.length === 0 ? (
              <p className="py-3 text-sm text-ink-soft">Nothing due right now. Reminders show up here when it&apos;s time.</p>
            ) : (
              <ul className="divide-y divide-line">
                {due.map(({ m, a, c }) => {
                  const text = renderTemplate(m.template, templateContext(a, c, settings, base));
                  const href = waLink(c.phone, text);
                  return (
                    <li key={m.id} className="flex items-center gap-3 py-3">
                      <Avatar first={c.firstName} last={c.lastName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="truncate text-xs text-ink-soft">
                          {prettyName(a.snapshot.serviceName)} · {fmt(a.startsAt, "ccc h:mm a")}
                          {m.status === "failed" && <span className="ml-1 text-[#a61b2b]">· auto-send failed</span>}
                        </p>
                      </div>
                      {href ? (
                        <SendReminderButton href={href} id={m.id} back="/admin" action={markReminderSentAction} />
                      ) : (
                        <span className="text-xs text-ink-soft">No mobile number</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {(attention.length > 0 || flagged.length > 0) && (
            <Card title="Needs attention" className="border-[#7a4a00]/30">
              <ul className="space-y-2.5 text-sm">
                {flagged.map(({ a, c }) => (
                  <li key={a.id} className="rounded-xl bg-[#fbe4e6] p-3">
                    <Link href={`/admin/appointments/${a.id}`} className="font-medium underline-offset-4 hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>{" "}
                    · {fmt(a.startsAt, "ccc LLL d, h:mm a")} · possible double booking
                  </li>
                ))}
                {attention.map(({ a, c }) => {
                  const ask = settings.whatsappTemplates.find((x) => /deposit/i.test(x.label));
                  const href = ask ? waLink(c.phone, renderTemplate(ask.body, templateContext(a, c, settings, base))) : null;
                  return (
                    <li key={a.id} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/appointments/${a.id}`} className="font-medium underline-offset-4 hover:underline">
                          {c.firstName} {c.lastName}
                        </Link>
                        <p className="truncate text-xs text-ink-soft">
                          Deposit {money(a.depositCents)} due · {prettyName(a.snapshot.serviceName)} {fmt(a.startsAt, "ccc LLL d")}
                        </p>
                      </div>
                      {href && (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#075e54] hover:bg-[#e3f1ea]" aria-label={`Ask ${c.firstName} for the deposit on WhatsApp`}>
                          <WhatsAppIcon size={14} /> Ask
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Card title="Quick actions">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["/admin/appointments/new", "New appointment", <AIPlus key="a" size={18} />],
                ["/admin/finance", "Log an expense", <AIWallet key="b" size={18} />],
                ["/admin/availability", "Block off time", <AIClock key="c" size={18} />],
                ["/", "Booking page", <AIExternal key="d" size={18} />],
              ].map(([href, label, icon]) => (
                <Link key={href as string} href={href as string} target={href === "/" ? "_blank" : undefined} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-3 font-medium text-ink-soft transition hover:border-lacquer/40 hover:bg-lacquer/5 hover:text-lacquer">
                  <span className="text-lacquer">{icon}</span> {label as string}
                </Link>
              ))}
            </div>
            {settings.phone && <p className="mt-3 text-xs text-ink-soft">Studio line: {prettyPhone(settings.phone)}</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
