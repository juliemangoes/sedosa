import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";
import { prettyName } from "@/lib/display";
import { appUrl } from "@/lib/env";
import { renderTemplate, templateContext, waLink } from "@/lib/whatsapp";
import { updateClientAction } from "../../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import { WhatsAppMenu } from "@/components/admin/WhatsAppButtons";
import { AIMail, AIMessage, AIPhone, AIPlus } from "@/components/admin/icons";
import { Avatar, Card, DepositBadge, Field, Flash, Stat, StatusBadge, btnCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const contactCls = "inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:border-plum/40 hover:text-plum";

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const db = await getDb();
  const c = await db.query.clients.findFirst({ where: eq(t.clients.id, Number(id)) });
  if (!c) notFound();
  const [appts, settings, h] = await Promise.all([
    db.select().from(t.appointments).where(eq(t.appointments.clientId, c.id)).orderBy(desc(t.appointments.startsAt)),
    getSettings(db),
    headers(),
  ]);
  const base = process.env.APP_URL ? appUrl() : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const zone = settings.timezone;
  const now = new Date();
  const spent = appts.reduce((n, a) => n + a.amountPaidCents, 0);
  const visits = appts.filter((a) => a.status === "completed" || (a.status === "confirmed" && a.startsAt <= now)).length;
  const noShows = appts.filter((a) => a.status === "no_show").length;
  const next = [...appts].reverse().find((a) => (a.status === "confirmed" || a.status === "pending") && a.startsAt > now) ?? null;
  const ctx = templateContext(next, c, settings, base);
  const waTemplates = waLink(c.phone)
    ? settings.whatsappTemplates.filter((x) => x.body.trim() && (next || !/\{(date|time|deposit|link)\}/.test(x.body))).map((x) => ({ label: x.label, text: renderTemplate(x.body, ctx), href: waLink(c.phone, renderTemplate(x.body, ctx))! }))
    : [];
  if (waLink(c.phone)) waTemplates.unshift({ label: "Blank message", text: "Open a chat with no text.", href: waLink(c.phone)! });

  return (
    <>
      <Link href="/admin/clients" className="text-sm text-stone-600 hover:text-plum">
        ‹ Clients
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar first={c.firstName} last={c.lastName} size="lg" />
          <div>
            <h1 className="font-serif text-[1.8rem] font-semibold leading-tight text-stone-900">
              {c.firstName} {c.lastName}
            </h1>
            <p className="mt-0.5 text-sm text-stone-500">
              Client since {DateTime.fromJSDate(c.createdAt).setZone(zone).toFormat("LLLL yyyy")}
              {c.lastLoginAt && ` · signed in ${DateTime.fromJSDate(c.lastLoginAt).setZone(zone).toRelative()}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.phone && (
            <>
              <a href={`tel:${c.phone}`} className={contactCls}>
                <AIPhone size={16} /> Call
              </a>
              <a href={`sms:${c.phone}`} className={contactCls}>
                <AIMessage size={16} /> Text
              </a>
            </>
          )}
          <a href={`mailto:${c.email}`} className={contactCls}>
            <AIMail size={16} /> Email
          </a>
          <WhatsAppMenu templates={waTemplates} />
          <Link href={`/admin/appointments/new?client=${c.id}`} className={btnCls}>
            <AIPlus size={17} /> Book
          </Link>
        </div>
      </div>
      <Flash sp={sp} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Visits" value={visits} />
        <Stat label="Total paid" value={money(spent)} hint={visits ? `${money(Math.round(spent / Math.max(1, visits)))} per visit` : undefined} />
        <Stat label="No-shows" value={noShows} tone={noShows ? "bad" : "default"} />
        <Stat label="Next visit" value={next ? DateTime.fromJSDate(next.startsAt).setZone(zone).toFormat("LLL d") : "—"} hint={next ? prettyName(next.snapshot.serviceName) : "Nothing booked"} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <Card title={`Appointments (${appts.length})`}>
          {appts.length === 0 ? (
            <p className="text-sm text-stone-500">No appointments yet.</p>
          ) : (
            <ul className="-mx-2 divide-y divide-stone-100">
              {appts.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/appointments/${a.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-3 text-sm hover:bg-stone-50">
                    <span className="w-40 tabular-nums text-stone-600">{DateTime.fromJSDate(a.startsAt).setZone(zone).toFormat("ccc LLL d, yyyy")}</span>
                    <span className="min-w-0 flex-1 font-medium">{prettyName(a.snapshot.serviceName)}</span>
                    <span className="tabular-nums text-stone-600">{money(a.priceCents)}</span>
                    <StatusBadge status={a.status} />
                    <DepositBadge status={a.depositStatus} cents={a.depositCents} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Details">
          <form key={`${c.firstName}${c.lastName}${c.email}${c.phone}${c.whatsappOptIn}${c.smsOptIn}${c.notes.length}`} action={updateClientAction} className="space-y-3">
            <input type="hidden" name="id" value={c.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" htmlFor="firstName">
                <input id="firstName" name="firstName" defaultValue={c.firstName} className={inputCls} required />
              </Field>
              <Field label="Last name" htmlFor="lastName">
                <input id="lastName" name="lastName" defaultValue={c.lastName} className={inputCls} required />
              </Field>
            </div>
            <Field label="Email" htmlFor="email">
              <input id="email" name="email" type="email" defaultValue={c.email} className={inputCls} required />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <input id="phone" name="phone" type="tel" defaultValue={c.phone} className={inputCls} />
            </Field>
            <fieldset className="space-y-2 rounded-xl bg-stone-50 p-3">
              <legend className="sr-only">Reminders</legend>
              <label className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" name="whatsappOptIn" defaultChecked={c.whatsappOptIn} className="mt-0.5 size-4 accent-[#6d2b67]" />
                <span>
                  <span className="font-medium">WhatsApp reminders</span>
                  <span className="block text-xs text-stone-500">Queues a reminder {settings.whatsappReminderHours}h before each visit.</span>
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" name="smsOptIn" defaultChecked={c.smsOptIn} className="mt-0.5 size-4 accent-[#6d2b67]" />
                <span className="font-medium">Text message reminders</span>
              </label>
            </fieldset>
            <Field label="Private notes" htmlFor="notes" hint="Allergies, preferences, brow shape… only you see this.">
              <textarea id="notes" name="notes" rows={4} defaultValue={c.notes} className={inputCls} />
            </Field>
            <SubmitButton className={btnCls}>Save</SubmitButton>
            <p className="text-xs text-stone-500">
              {c.stripePaymentMethodId ? "Card on file · " : ""}
              {c.lastLoginAt ? "Has a client account" : "Hasn't signed in to an account yet"}
            </p>
          </form>
        </Card>
      </div>
    </>
  );
}
