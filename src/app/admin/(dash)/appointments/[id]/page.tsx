import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { duration, longDateTime, money, prettyPhone } from "@/lib/format";
import { answerText } from "@/lib/intake";
import { stripeEnabled } from "@/lib/env";
import {
  cancelAppointmentAction,
  chargeCardAction,
  markDepositAction,
  recordPaymentAction,
  rescheduleAction,
  resendConfirmationAction,
  saveAdminNotesAction,
  setStatusAction,
} from "../../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import { Card, DepositBadge, Field, Flash, StatusBadge, btnCls, btnDangerCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const METHODS = [
  ["cash", "Cash"],
  ["cashapp", "Cash App"],
  ["zelle", "Zelle"],
  ["card", "Card (in person)"],
  ["other", "Other"],
] as const;

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
  const [c, settings, payments, messages, locations, history] = await Promise.all([
    db.query.clients.findFirst({ where: eq(t.clients.id, a.clientId) }),
    getSettings(db),
    db.select().from(t.payments).where(eq(t.payments.appointmentId, a.id)).orderBy(asc(t.payments.createdAt)),
    db.select().from(t.messageLog).where(eq(t.messageLog.appointmentId, a.id)).orderBy(desc(t.messageLog.createdAt)),
    db.select().from(t.locations).orderBy(asc(t.locations.sortOrder)),
    db.select({ id: t.appointments.id }).from(t.appointments).where(eq(t.appointments.clientId, a.clientId)),
  ]);
  if (!c) notFound();
  const zone = settings.timezone;
  const s = a.snapshot;
  const balance = a.priceCents - a.amountPaidCents;
  const active = a.status === "confirmed" || a.status === "pending";
  const hasCard = !!(c.stripeCustomerId && c.stripePaymentMethodId) && stripeEnabled();
  const forms = [...new Set(a.answers.map((x) => x.formName))];
  const manageLink = `/booking/${a.token}`;

  return (
    <>
      <Link href="/admin" className="text-sm text-stone-600 hover:text-plum">
        ‹ Appointments
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-plum">
          {c.firstName} {c.lastName}
        </h1>
        <StatusBadge status={a.status} />
        <DepositBadge status={a.depositStatus} cents={a.depositCents} />
      </div>
      <Flash sp={sp} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card title="Appointment">
            <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
              <dt className="text-stone-500">Service</dt>
              <dd>
                <span className="font-medium">{s.serviceName}</span> ({money(s.servicePriceCents)})
                {s.addons.map((x) => (
                  <div key={x.id}>
                    + {x.name} ({money(x.priceCents)}, {x.durationMin} min)
                  </div>
                ))}
              </dd>
              <dt className="text-stone-500">When</dt>
              <dd className="font-medium">
                {longDateTime(a.startsAt, zone)} · {duration(Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60000))}
              </dd>
              <dt className="text-stone-500">Where</dt>
              <dd>
                {s.locationName} <span className="text-stone-500">{s.locationAddress}</span>
              </dd>
              <dt className="text-stone-500">Price</dt>
              <dd>
                {money(a.priceCents)} · paid {money(a.amountPaidCents)} ·{" "}
                <strong>{balance > 0 ? `${money(balance)} due` : balance < 0 ? `${money(-balance)} over` : "paid in full"}</strong>
              </dd>
              <dt className="text-stone-500">Booked</dt>
              <dd>
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
              <div className="mt-4 rounded-md bg-stone-50 p-3 text-sm">
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

          <Card title="Payments">
            {payments.length === 0 ? (
              <p className="text-sm text-stone-500">No payments recorded.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-stone-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2">{DateTime.fromJSDate(p.createdAt).setZone(zone).toFormat("LLL d h:mm a")}</td>
                      <td className="py-2 capitalize">{p.kind.replace(/_/g, " ")}</td>
                      <td className="py-2">{p.method === "cashapp" ? "Cash App" : p.method}</td>
                      <td className="py-2 text-right font-medium">{money(p.amountCents)}</td>
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
              <ul className="space-y-2 text-sm">
                {messages.map((m) => (
                  <li key={m.id} className="flex flex-wrap gap-x-2">
                    <span className="text-stone-500">{DateTime.fromJSDate(m.createdAt).setZone(zone).toFormat("LLL d h:mm a")}</span>
                    <span className="uppercase text-stone-500">{m.channel}</span>
                    <span>{m.subject || m.body.slice(0, 80)}</span>
                    <span className={m.status === "failed" ? "text-red-700" : m.status === "logged" ? "text-amber-700" : "text-emerald-700"}>
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
            <p className="font-medium">
              <Link href={`/admin/clients/${c.id}`} className="underline">
                {c.firstName} {c.lastName}
              </Link>
            </p>
            <p className="mt-1 text-sm">
              <a href={`tel:${c.phone}`} className="hover:text-plum">
                {prettyPhone(c.phone) || "No phone"}
              </a>
              {c.phone && (
                <>
                  {" · "}
                  <a href={`sms:${c.phone}`} className="underline">
                    Text
                  </a>
                </>
              )}
            </p>
            <p className="text-sm">
              <a href={`mailto:${c.email}`} className="hover:text-plum">
                {c.email}
              </a>
            </p>
            <p className="mt-2 text-xs text-stone-500">
              {history.length} appointment{history.length === 1 ? "" : "s"} · SMS {c.smsOptIn ? "opted in" : "not opted in"}
              {hasCard && " · card on file"}
            </p>
            {c.notes && <p className="mt-3 whitespace-pre-line rounded-md bg-stone-50 p-2 text-sm">{c.notes}</p>}
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
              <form action={cancelAppointmentAction} className="mt-4 space-y-2 border-t border-stone-100 pt-4">
                <input type="hidden" name="id" value={a.id} />
                <input name="reason" placeholder="Reason (optional, internal)" className={inputCls} aria-label="Cancellation reason" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="notify" defaultChecked /> Email/text the client
                </label>
                <SubmitButton className={btnDangerCls} confirm="Cancel this appointment?" pendingText="Canceling…">
                  Cancel appointment
                </SubmitButton>
              </form>
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

          {a.depositCents > 0 && a.depositStatus === "due" && a.status !== "cancelled" && a.status !== "expired" && (
            <Card title={`Deposit (${money(a.depositCents)})`}>
              <form action={markDepositAction} className="flex gap-2">
                <input type="hidden" name="id" value={a.id} />
                <select name="method" className={inputCls} aria-label="Deposit method">
                  {METHODS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <SubmitButton className={btnCls}>Mark paid</SubmitButton>
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
                  <input
                    id="startsAt"
                    type="datetime-local"
                    name="startsAt"
                    required
                    step={300}
                    className={inputCls}
                    defaultValue={DateTime.fromJSDate(a.startsAt).setZone(zone).toFormat("yyyy-LL-dd'T'HH:mm")}
                  />
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
                  <input type="checkbox" name="force" /> Allow outside hours / overlapping
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="notify" defaultChecked /> Email/text the client
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
