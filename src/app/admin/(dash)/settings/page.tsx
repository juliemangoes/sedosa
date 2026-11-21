import { headers } from "next/headers";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { appUrl, stripeEnabled } from "@/lib/env";
import { rotateFeedKeyAction, saveSettingsAction } from "../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import { Card, Field, Flash, PageHeader, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

function Status({ on, label, hint }: { on: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className={`mt-1 inline-block size-2.5 shrink-0 rounded-full ${on ? "bg-emerald-500" : "bg-stone-300"}`} aria-hidden="true" />
      <span>
        <span className="font-medium">{label}</span> <span className={on ? "text-emerald-700" : "text-stone-500"}>{on ? "connected" : "not set up"}</span>
        {!on && <span className="block text-xs text-stone-500">{hint}</span>}
      </span>
    </li>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const s = await getSettings(db);
  const h = await headers();
  const base = process.env.APP_URL ? appUrl() : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const feed = `${base}/api/calendar/${s.calendarFeedKey}`;
  const policies = [...s.policies, ...Array.from({ length: Math.max(0, 6 - s.policies.length) }, () => ({ title: "", body: "" }))];

  return (
    <>
      <PageHeader title="Settings" />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <form action={saveSettingsAction} className="space-y-6">
          <Card title="Studio">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" htmlFor="businessName">
                <input id="businessName" name="businessName" defaultValue={s.businessName} required className={inputCls} />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <input id="phone" name="phone" defaultValue={s.phone} className={inputCls} />
              </Field>
              <Field label="Email" htmlFor="email">
                <input id="email" name="email" defaultValue={s.email} className={inputCls} />
              </Field>
              <Field label="Instagram" htmlFor="instagram">
                <input id="instagram" name="instagram" defaultValue={s.instagram} className={inputCls} />
              </Field>
              <Field label="Facebook" htmlFor="facebook">
                <input id="facebook" name="facebook" defaultValue={s.facebook} className={inputCls} />
              </Field>
              <Field label="Time zone" htmlFor="timezone">
                <input id="timezone" name="timezone" defaultValue={s.timezone} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card title="Booking rules">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Start times every (min)" htmlFor="slotIntervalMin">
                <input id="slotIntervalMin" name="slotIntervalMin" type="number" min={5} step={5} defaultValue={s.slotIntervalMin} className={inputCls} />
              </Field>
              <Field label="Minimum notice (hours)" htmlFor="minNoticeHours">
                <input id="minNoticeHours" name="minNoticeHours" type="number" min={0} step={0.5} defaultValue={s.minNoticeMinutes / 60} className={inputCls} />
              </Field>
              <Field label="Book up to (days ahead)" htmlFor="maxDaysAhead">
                <input id="maxDaysAhead" name="maxDaysAhead" type="number" min={1} max={365} defaultValue={s.maxDaysAhead} className={inputCls} />
              </Field>
              <Field label="Online reschedule until (hours before)" htmlFor="rescheduleCutoffHours">
                <input id="rescheduleCutoffHours" name="rescheduleCutoffHours" type="number" min={0} defaultValue={s.rescheduleCutoffHours} className={inputCls} />
              </Field>
              <Field label="Online cancel until (hours before)" htmlFor="cancelCutoffHours">
                <input id="cancelCutoffHours" name="cancelCutoffHours" type="number" min={0} defaultValue={s.cancelCutoffHours} className={inputCls} />
              </Field>
              <Field label="Reminder (hours before)" htmlFor="reminderHoursBefore">
                <input id="reminderHoursBefore" name="reminderHoursBefore" type="number" min={1} max={168} defaultValue={s.reminderHoursBefore} className={inputCls} />
              </Field>
              <Field label="Hold unpaid online bookings (min)" htmlFor="holdMinutes" hint="Minimum 30 (Stripe limit)">
                <input id="holdMinutes" name="holdMinutes" type="number" min={30} defaultValue={s.holdMinutes} className={inputCls} />
              </Field>
              <Field label="No-show fee ($)" htmlFor="noShowFee">
                <input id="noShowFee" name="noShowFee" inputMode="decimal" defaultValue={(s.noShowFeeCents / 100).toFixed(2)} className={inputCls} />
              </Field>
              <Field label="Late cancel fee ($)" htmlFor="lateCancelFee">
                <input id="lateCancelFee" name="lateCancelFee" inputMode="decimal" defaultValue={(s.lateCancelFeeCents / 100).toFixed(2)} className={inputCls} />
              </Field>
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input type="checkbox" name="sharedStaff" defaultChecked={s.sharedStaff} className="mt-0.5" />
              <span>
                One person works both locations: a booking at either location blocks that time everywhere.
                <span className="block text-xs text-stone-500">Untick if each location has its own staff.</span>
              </span>
            </label>
          </Card>

          <Card title="Deposits">
            <p className="mb-3 text-sm text-stone-600">
              {stripeEnabled()
                ? "Stripe is connected: clients pay the deposit by card when they book, and the card is saved for no-show fees."
                : "Stripe isn't connected, so clients see these instructions and you mark deposits paid from each appointment."}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cash App $cashtag" htmlFor="cashAppHandle">
                <input id="cashAppHandle" name="cashAppHandle" defaultValue={s.cashAppHandle} placeholder="$sedosabeauty" className={inputCls} />
              </Field>
              <Field label="Zelle (phone or email)" htmlFor="zelleHandle">
                <input id="zelleHandle" name="zelleHandle" defaultValue={s.zelleHandle} className={inputCls} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Deposit instructions" htmlFor="manualDepositInstructions">
                <textarea id="manualDepositInstructions" name="manualDepositInstructions" rows={3} defaultValue={s.manualDepositInstructions} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card title="Policies & wording">
            <p className="mb-3 text-sm text-stone-600">Shown before clients book, on their confirmation page, and in emails.</p>
            <div className="space-y-3">
              {policies.map((p, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                  <input name={`policyTitle_${i}`} defaultValue={p.title} placeholder="Title" className={inputCls} aria-label={`Policy ${i + 1} title`} />
                  <textarea name={`policyBody_${i}`} defaultValue={p.body} rows={2} placeholder="Policy text" className={inputCls} aria-label={`Policy ${i + 1} text`} />
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4">
              <Field label="Location note (before booking)" htmlFor="locationNote">
                <input id="locationNote" name="locationNote" defaultValue={s.locationNote} className={inputCls} />
              </Field>
              <Field label="Thank-you note (after booking)" htmlFor="confirmationNote">
                <textarea id="confirmationNote" name="confirmationNote" rows={2} defaultValue={s.confirmationNote} className={inputCls} />
              </Field>
            </div>
          </Card>
          <SubmitButton className={btnCls}>Save settings</SubmitButton>
        </form>

        <div className="space-y-6">
          <Card title="Connections">
            <ul className="text-sm">
              <Status on={stripeEnabled()} label="Stripe" hint="Card deposits & no-show fees. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET." />
              <Status on={!!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)} label="Email" hint="Set RESEND_API_KEY and EMAIL_FROM." />
              <Status on={!!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_FROM)} label="Text messages" hint="Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM." />
              <Status on={!!process.env.OWNER_EMAIL} label="New-booking alerts" hint="Set OWNER_EMAIL to get an email for each booking." />
            </ul>
          </Card>
          <Card title="Calendar on your phone">
            <p className="text-sm text-stone-600">Subscribe to this private link in Google Calendar (Other calendars → From URL) or on iPhone (Settings → Calendar → Accounts → Add Subscribed Calendar).</p>
            <input readOnly value={feed} className={`${inputCls} mt-3 text-xs`} aria-label="Calendar feed link" />
            <form action={rotateFeedKeyAction} className="mt-3">
              <SubmitButton className={btnSecondaryCls} confirm="Create a new link? The old one stops working.">
                Reset link
              </SubmitButton>
            </form>
          </Card>
          <Card title="Booking link">
            <p className="text-sm text-stone-600">Put this in your Instagram bio:</p>
            <input readOnly value={base} className={`${inputCls} mt-2 text-xs`} aria-label="Booking page link" />
          </Card>
        </div>
      </div>
    </>
  );
}
