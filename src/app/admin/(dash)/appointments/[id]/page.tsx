import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { duration, money, prettyPhone } from "@/lib/format";
import { prettyName } from "@/lib/display";
import { answerText } from "@/lib/intake";
import { appUrl, stripeEnabled } from "@/lib/env";
import { renderTemplate, templateContext, waLink, whatsappApiConfigured } from "@/lib/whatsapp";
import {
  cancelAppointmentAction,
  cancelScheduledAction,
  chargeCardAction,
  markDepositAction,
  markReminderSentAction,
  recordPaymentAction,
  rescheduleAction,
  resendConfirmationAction,
  saveAdminNotesAction,
  scheduleWhatsAppAction,
  setStatusAction,
} from "../../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import { SendReminderButton, WhatsAppMenu } from "@/components/admin/WhatsAppButtons";
import { AIClock, AIMail, AIMessage, AIPhone } from "@/components/admin/icons";
import { Avatar, Card, DepositBadge, Field, Flash, StatusBadge, btnCls, btnDangerCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const METHODS = [
  ["cash", "Cash"],
  ["cashapp", "Cash App"],
  ["zelle", "Zelle"],
  ["card", "Card (in person)"],
  ["other", "Other"],
] as const;

const CHANNEL: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };

const contactCls = "inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:border-plum/40 hover:text-plum";

export default async function AppointmentDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  const a = await db.query.appointments.findFirst({ where: eq(t.appointments.id, id) });
  if (!a) notFound();
  const h = await headers();
  const base = process.env.APP_URL ? appUrl() : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const [c, settings, payments, messages, locations, history, queued] = await Promise.all([
    db.query.clients.findFirst({ where: eq(t.clients.id, a.clientId) }),
    getSettings(db),
    db.select().from(t.payments).where(eq(t.payments.appointmentId, a.id)).orderBy(asc(t.payments.createdAt)),
    db.select().from(t.messageLog).where(eq(t.messageLog.appointmentId, a.id)).orderBy(desc(t.messageLog.createdAt)),
    db.select().from(t.locations).orderBy(asc(t.locations.sortOrder)),
    db.select({ id: t.appointments.id }).from(t.appointments).where(eq(t.appointments.clientId, a.clientId)),
    db.select().from(t.scheduledMessages).where(eq(t.scheduledMessages.appointmentId, a.id)).orderBy(asc(t.scheduledMessages.sendAt)),
  ]);
  if (!c) notFound();
  const zone = settings.timezone;
  const s = a.snapshot;
  const start = DateTime.fromJSDate(a.startsAt).setZone(zone);
  const balance = a.priceCents - a.amountPaidCents;
  const active = a.status === "confirmed" || a.status === "pending";
  const upcoming = active && a.startsAt > new Date();
  const hasCard = !!(c.stripeCustomerId && c.stripePaymentMethodId) && stripeEnabled();
  const forms = [...new Set(a.answers.map((x) => x.formName))];
  const manageLink = `/booking/${a.token}`;
  const back = `/admin/appointments/${a.id}`;
  const ctx = templateContext(a, c, settings, base);
  const wa = waLink(c.phone);
  const waTemplates = wa ? settings.whatsappTemplates.filter((x) => x.body.trim()).map((x) => ({ label: x.label, text: renderTemplate(x.body, ctx), href: waLink(c.phone, renderTemplate(x.body, ctx))! })) : [];
  const viaApi = whatsappApiConfigured();
  const now = new Date();
  const hoursAhead = (a.startsAt.getTime() - now.getTime()) / 3_600_000;
  const morning = start.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });

  return (
    <>
      <Link href="/admin/calendar" className="text-sm text-stone-600 hover:text-plum">
        ‹ Calendar
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar first={c.firstName} last={c.lastName} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-[1.8rem] font-semibold leading-tight text-stone-900">
                {c.firstName} {c.lastName}
              </h1>
              <StatusBadge status={a.status} />
              <DepositBadge status={a.depositStatus} cents={a.depositCents} />
            </div>
            <p className="mt-1 text-stone-600">
              <span className="font-medium text-stone-900">{prettyName(s.serviceName)}</span> · {start.toFormat("cccc, LLL d")} at {start.toFormat("h:mm a")}
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
          {c.email && (
            <a href={`mailto:${c.email}`} className={contactCls}>
              <AIMail size={16} /> Email
            </a>
          )}
          <WhatsAppMenu templates={waTemplates} />
        </div>
      </div>
      <Flash sp={sp} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card title="Appointment">
            <dl className="grid grid-cols-[6.5rem_1fr] gap-y-3 text-sm">
              <dt className="text-stone-500">Service</dt>
              <dd>
                <span className="font-medium">{prettyName(s.serviceName)}</span> <span className="text-stone-500">({money(s.servicePriceCents)})</span>
                {s.addons.map((x) => (
                  <div key={x.id} className="text-stone-700">
                    + {prettyName(x.name)} <span className="text-stone-500">({money(x.priceCents)}, {x.durationMin} min)</span>
                  </div>
                ))}
              </dd>
              <dt className="text-stone-500">When</dt>
              <dd className="font-medium">
                {start.toFormat("cccc, LLLL d, yyyy · h:mm a")} <span className="font-normal text-stone-500">· {duration(Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60000))}</span>
              </dd>
              <dt className="text-stone-500">Where</dt>
              <dd>
                {s.locationName} <span className="block text-stone-500">{s.locationAddress}</span>
              </dd>
              <dt className="text-stone-500">Price</dt>
              <dd>
                {money(a.priceCents)} · paid {money(a.amountPaidCents)} ·{" "}
                <strong className={balance > 0 ? "text-amber-800" : "text-emerald-700"}>{balance > 0 ? `${money(balance)} due` : balance < 0 ? `${money(-balance)} over` : "paid in full"}</strong>
              </dd>
              <dt className="text-stone-500">Booked</dt>
              <dd className="text-stone-700">
                {DateTime.fromJSDate(a.createdAt).setZone(zone).toFormat("LLL d, yyyy h:mm a")} by {a.bookedBy === "admin" ? "you" : "client online"}
                {a.rescheduleCount > 0 && ` · rescheduled ${a.rescheduleCount}×`}
                {a.cancelledAt && ` · canceled ${DateTime.fromJSDate(a.cancelledAt).setZone(zone).toFormat("LLL d h:mm a")} by ${a.cancelledBy}`}
              </dd>
              {a.status === "pending" && a.holdExpiresAt && (
                <>
                  <dt className="text-stone-500">Hold</dt>
                  <dd>Waiting for online deposit until {DateTime.fromJSDate(a.holdExpiresAt).setZone(zone).toFormat("h:mm a")}</dd>
                </>
              )}
            </dl>
            {a.clientNotes && (
              <div className="mt-4 rounded-xl bg-blush/50 p-3 text-sm">
                <p className="mb-1 font-medium">Client note</p>
                <p className="whitespace-pre-line">{a.clientNotes}</p>
              </div>
            )}
            <p className="mt-4 text-xs text-stone-500">
              Client&apos;s manage link:{" "}
              <a className="underline" href={manageLink} target="_blank">
                {manageLink.slice(0, 22)}…
              </a>
            </p>
          </Card>

          <Card title="Intake & consent answers">
            {a.answers.length === 0 ? (
              <p className="text-sm text-stone-500">No form answers for this booking.</p>
            ) : (
              forms.map((f) => (
                <div key={f} className="mb-5 last:mb-0">
                  <h3 className="mb-2 text-sm font-semibold text-plum">{f}</h3>
                  <dl className="space-y-2 text-sm">
                    {a.answers
                      .filter((x) => x.formName === f)
                      .map((x) => (
                        <div key={x.fieldId} className="grid gap-1 sm:grid-cols-[1fr_12rem] sm:gap-4">
                          <dt className="text-stone-600">{x.label}</dt>
                          <dd className={`font-medium ${x.value === "yes" ? "text-amber-800" : ""}`}>{answerText(x)}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              ))
            )}
          </Card>

          <Card title="Payments" subtitle="Every payment here also shows up in Finance.">
            {payments.length === 0 ? (
              <p className="text-sm text-stone-500">No payments recorded.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-stone-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2">{DateTime.fromJSDate(p.createdAt).setZone(zone).toFormat("LLL d h:mm a")}</td>
                      <td className="py-2 capitalize">{p.kind.replace(/_/g, " ")}</td>
                      <td className="py-2">{p.method === "cashapp" ? "Cash App" : p.method === "stripe" ? "Card (online)" : p.method}</td>
                      <td className="py-2 text-right font-medium tabular-nums">{money(p.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <form key={`pay-${a.amountPaidCents}-${a.priceCents}`} action={recordPaymentAction} className="mt-4 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-4">
              <input type="hidden" name="id" value={a.id} />
              <Field label="Amount" htmlFor="amount">
                <input id="amount" name="amount" className={inputCls} defaultValue={balance > 0 ? (balance / 100).toFixed(2) : ""} inputMode="decimal" />
              </Field>
              <Field label="For" htmlFor="kind">
                <select id="kind" name="kind" className={inputCls}>
                  <option value="balance">Balance</option>
                  <option value="tip">Tip</option>
                  <option value="no_show_fee">No-show fee</option>
                  <option value="late_fee">Late cancel fee</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Method" htmlFor="method">
                <select id="method" name="method" className={inputCls}>
                  {METHODS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end">
                <SubmitButton className={`${btnSecondaryCls} w-full`}>Record payment</SubmitButton>
              </div>
            </form>
          </Card>

          <Card title="Messages sent">
            {messages.length === 0 ? (
              <p className="text-sm text-stone-500">None yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {messages.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                    <span className="w-28 shrink-0 text-stone-500">{DateTime.fromJSDate(m.createdAt).setZone(zone).toFormat("LLL d h:mm a")}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${m.channel === "whatsapp" ? "bg-emerald-50 text-[#075e54]" : "bg-stone-100 text-stone-600"}`}>{CHANNEL[m.channel] ?? m.channel}</span>
                    <span className="min-w-0 flex-1 truncate">{m.subject || m.body.slice(0, 90)}</span>
                    <span className={m.status === "failed" ? "text-rose-700" : m.status === "logged" ? "text-amber-800" : "text-emerald-700"}>
                      {m.status === "logged" ? "not sent (provider not set up)" : m.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Client">
            <Link href={`/admin/clients/${c.id}`} className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 hover:text-plum">
              {c.firstName} {c.lastName}
            </Link>
            <p className="mt-1 text-sm text-stone-700">{prettyPhone(c.phone) || "No phone"}</p>
            <p className="text-sm text-stone-700">{c.email}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-700">
                {history.length} visit{history.length === 1 ? "" : "s"}
              </span>
              <span className={`rounded-full px-2 py-0.5 ${c.whatsappOptIn ? "bg-emerald-50 text-[#075e54]" : "bg-stone-100 text-stone-600"}`}>WhatsApp {c.whatsappOptIn ? "reminders on" : "not opted in"}</span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">SMS {c.smsOptIn ? "on" : "off"}</span>
              {hasCard && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">Card on file</span>}
            </div>
            {c.notes && <p className="mt-3 whitespace-pre-line rounded-xl bg-stone-50 p-3 text-sm">{c.notes}</p>}
          </Card>

          {active && (
            <Card title="Status">
              <div className="flex flex-wrap gap-2">
                <form action={setStatusAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <SubmitButton name="status" value="completed" className={btnCls}>
                    Completed
                  </SubmitButton>
                </form>
                <form action={setStatusAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <SubmitButton name="status" value="no_show" className={btnSecondaryCls} confirm="Mark this client as a no-show?">
                    No-show
                  </SubmitButton>
                </form>
                <form action={resendConfirmationAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <SubmitButton className={btnSecondaryCls} pendingText="Sending…">
                    Resend confirmation
                  </SubmitButton>
                </form>
              </div>
              <details className="group mt-4 border-t border-stone-100 pt-3">
                <summary className="cursor-pointer text-sm font-medium text-rose-700">Cancel appointment…</summary>
                <form action={cancelAppointmentAction} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={a.id} />
                  <input name="reason" placeholder="Reason (optional, internal)" className={inputCls} aria-label="Cancellation reason" />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="notify" defaultChecked className="size-4 accent-[#6d2b67]" /> Email/text the client
                  </label>
                  <SubmitButton className={btnDangerCls} confirm="Cancel this appointment?" pendingText="Canceling…">
                    Cancel appointment
                  </SubmitButton>
                </form>
              </details>
            </Card>
          )}
          {(a.status === "completed" || a.status === "no_show") && (
            <Card title="Status">
              <form action={setStatusAction}>
                <input type="hidden" name="id" value={a.id} />
                <SubmitButton name="status" value="confirmed" className={btnSecondaryCls}>
                  Undo: back to confirmed
                </SubmitButton>
              </form>
            </Card>
          )}

          <Card
            title="WhatsApp reminders"
            subtitle={viaApi ? "Sent automatically through your WhatsApp Business number." : "When one is due it appears on Home, ready to send in one tap."}
          >
            {queued.length === 0 ? (
              <p className="text-sm text-stone-500">
                {!wa ? "Add a mobile number to this client to use WhatsApp." : c.whatsappOptIn || !upcoming ? "Nothing scheduled." : "Nothing scheduled. This client hasn't opted in to automatic reminders, but you can still schedule one."}
              </p>
            ) : (
              <ul className="space-y-2">
                {queued.map((m) => {
                  const due = (m.status === "scheduled" || m.status === "failed") && m.sendAt <= now;
                  const text = renderTemplate(m.template, ctx);
                  return (
                    <li key={m.id} className="rounded-xl border border-stone-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          <AIClock size={15} />
                          {DateTime.fromJSDate(m.sendAt).setZone(zone).toFormat("ccc LLL d, h:mm a")}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${
                            m.status === "sent" ? "bg-emerald-50 text-emerald-800" : m.status === "failed" ? "bg-rose-50 text-rose-800" : m.status === "canceled" ? "bg-stone-100 text-stone-500" : due ? "bg-amber-50 text-amber-900" : "bg-plum/10 text-plum"
                          }`}
                        >
                          {m.status === "sent" ? (m.sentVia === "manual" ? "Sent by you" : "Sent") : m.status === "failed" ? "Didn't send" : m.status === "canceled" ? "Canceled" : due ? "Due now" : m.origin === "auto" ? "Automatic" : "Scheduled"}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-xs text-stone-600">{text}</p>
                      {m.error && <p className="mt-1 text-xs text-rose-700">{m.error}</p>}
                      {(m.status === "scheduled" || m.status === "failed") && (
                        <div className="mt-2 flex items-center gap-2">
                          {due && wa && <SendReminderButton href={waLink(c.phone, text)!} id={m.id} back={back} action={markReminderSentAction} />}
                          <form action={cancelScheduledAction}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="back" value={back} />
                            <SubmitButton className="rounded-lg px-2 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-rose-700">Cancel</SubmitButton>
                          </form>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {upcoming && wa && (
              <details className="mt-4 border-t border-stone-100 pt-3" open={queued.every((m) => m.status !== "scheduled")}>
                <summary className="cursor-pointer text-sm font-medium text-plum">Schedule a reminder</summary>
                <form key={`wa-${queued.length}`} action={scheduleWhatsAppAction} className="group/wa mt-3 space-y-3">
                  <input type="hidden" name="appointmentId" value={a.id} />
                  <fieldset>
                    <legend className="mb-1.5 text-sm font-medium text-stone-700">Send it</legend>
                    <div className="grid grid-cols-2 gap-1.5 text-sm">
                      {(
                        [
                          ["24", "1 day before", hoursAhead > 24],
                          ["2", "2 hours before", hoursAhead > 2],
                          ["morning", "Morning of (9 AM)", morning > DateTime.now().setZone(zone) && start.diff(morning, "minutes").minutes >= 30],
                          ["custom", "Pick a time", true],
                        ] as const
                      )
                        .filter(([, , ok]) => ok)
                        .map(([v, l], i) => (
                          <label key={v} className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 has-[:checked]:border-plum has-[:checked]:bg-plum/5 has-[:checked]:font-medium">
                            <input type="radio" name="when" value={v} defaultChecked={i === 0} className="accent-[#6d2b67]" />
                            {l}
                          </label>
                        ))}
                    </div>
                  </fieldset>
                  <div className="hidden group-has-[[value=custom]:checked]/wa:block">
                    <Field label="Send at" htmlFor="wa-sendAt">
                      <input id="wa-sendAt" name="sendAt" type="datetime-local" step={300} className={inputCls} defaultValue={start.minus({ hours: 3 }).toFormat("yyyy-LL-dd'T'HH:mm")} />
                    </Field>
                  </div>
                  <Field label="Message" htmlFor="wa-template" hint="{first}, {service}, {date}, {time}, {studio} and {link} are filled in for you.">
                    <textarea id="wa-template" name="template" rows={4} defaultValue={settings.whatsappReminderTemplate} className={`${inputCls} text-sm`} />
                  </Field>
                  <SubmitButton className={btnCls}>Schedule reminder</SubmitButton>
                </form>
              </details>
            )}
          </Card>

          {a.depositCents > 0 && a.depositStatus === "due" && a.status !== "cancelled" && a.status !== "expired" && (
            <Card title={`Deposit (${money(a.depositCents)})`}>
              <form action={markDepositAction} className="flex gap-2">
                <input type="hidden" name="id" value={a.id} />
                <select name="method" className={`${inputCls} min-w-0 flex-1`} aria-label="Deposit method">
                  {METHODS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <SubmitButton className={`${btnCls} shrink-0 whitespace-nowrap`}>Mark paid</SubmitButton>
              </form>
              <form action={markDepositAction} className="mt-2">
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="mode" value="waive" />
                <SubmitButton className="text-sm text-stone-600 underline">Waive deposit</SubmitButton>
              </form>
            </Card>
          )}

          {hasCard && (
            <Card title="Charge card on file">
              <form action={chargeCardAction} className="space-y-2">
                <input type="hidden" name="id" value={a.id} />
                <select name="kind" className={inputCls} aria-label="Charge type">
                  <option value="no_show_fee">No-show fee</option>
                  <option value="late_fee">Late cancellation fee</option>
                  <option value="balance">Balance</option>
                </select>
                <input name="amount" className={inputCls} defaultValue={(settings.noShowFeeCents / 100).toFixed(2)} aria-label="Amount" inputMode="decimal" />
                <SubmitButton className={btnSecondaryCls} confirm="Charge the client's saved card now?" pendingText="Charging…">
                  Charge card
                </SubmitButton>
              </form>
            </Card>
          )}

          {active && (
            <Card title="Reschedule">
              <form key={`move-${a.startsAt.getTime()}-${a.locationId}`} action={rescheduleAction} className="space-y-3">
                <input type="hidden" name="id" value={a.id} />
                <Field label="New date & time" htmlFor="startsAt">
                  <input id="startsAt" type="datetime-local" name="startsAt" required step={300} className={inputCls} defaultValue={start.toFormat("yyyy-LL-dd'T'HH:mm")} />
                </Field>
                <Field label="Location" htmlFor="locationId">
                  <select id="locationId" name="locationId" defaultValue={a.locationId} className={inputCls}>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="force" className="size-4 accent-[#6d2b67]" /> Allow outside hours / overlapping
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="notify" defaultChecked className="size-4 accent-[#6d2b67]" /> Email/text the client
                </label>
                <SubmitButton className={btnCls}>Move appointment</SubmitButton>
              </form>
            </Card>
          )}

          <Card title="Private notes">
            <form key={`notes-${a.updatedAt.getTime()}`} action={saveAdminNotesAction} className="space-y-2">
              <input type="hidden" name="id" value={a.id} />
              <textarea name="adminNotes" rows={4} defaultValue={a.adminNotes} className={inputCls} aria-label="Private notes" />
              <SubmitButton className={btnSecondaryCls}>Save notes</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
