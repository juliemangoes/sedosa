import { DateTime } from "luxon";
import { asc, gte } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { addOverrideAction, addTimeOffAction, deleteOverrideAction, deleteTimeOffAction, saveLocationAction } from "../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import { Card, Field, Flash, PageHeader, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function hoursText(ivs: t.DayInterval[] | undefined) {
  return (ivs ?? []).map((i) => `${i.start}-${i.end}`).join(", ");
}

function LocationForm({ loc }: { loc?: typeof t.locations.$inferSelect }) {
  return (
    <form action={saveLocationAction} className="space-y-4">
      <input type="hidden" name="id" value={loc?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_5rem]">
        <Field label="Name" htmlFor={`name-${loc?.id ?? "new"}`}>
          <input id={`name-${loc?.id ?? "new"}`} name="name" defaultValue={loc?.name} required className={inputCls} />
        </Field>
        <Field label="Address" htmlFor={`addr-${loc?.id ?? "new"}`} hint="Sent to clients after they book.">
          <input id={`addr-${loc?.id ?? "new"}`} name="address" defaultValue={loc?.address} className={inputCls} />
        </Field>
        <Field label="Order" htmlFor={`ord-${loc?.id ?? "new"}`}>
          <input id={`ord-${loc?.id ?? "new"}`} name="sortOrder" type="number" defaultValue={loc?.sortOrder ?? 0} className={inputCls} />
        </Field>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-stone-700">Weekly hours</p>
        <p className="mb-2 text-xs text-stone-500">Like 09:30-20:00. Split shifts: 09:00-13:00, 15:00-20:00. Leave blank for closed.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DAYS.map((d, i) => (
            <label key={d} className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-sm">
              {d}
              <input name={`hours_${i + 1}`} defaultValue={hoursText(loc?.weeklyHours[String(i + 1)])} placeholder="Closed" className={inputCls} />
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={loc?.active ?? true} /> Taking bookings
        </label>
        <SubmitButton className={btnCls}>{loc ? "Save hours" : "Add location"}</SubmitButton>
      </div>
    </form>
  );
}

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const settings = await getSettings(db);
  const zone = settings.timezone;
  const today = DateTime.now().setZone(zone);
  const [locations, overrides, off] = await Promise.all([
    db.select().from(t.locations).orderBy(asc(t.locations.sortOrder), asc(t.locations.id)),
    db.select().from(t.dateOverrides).where(gte(t.dateOverrides.date, today.toISODate()!)).orderBy(asc(t.dateOverrides.date)),
    db.select().from(t.timeOff).where(gte(t.timeOff.endsAt, today.toJSDate())).orderBy(asc(t.timeOff.startsAt)),
  ]);
  const locName = (id: number | null) => (id === null ? "All locations" : locations.find((l) => l.id === id)?.name ?? "?");

  return (
    <>
      <PageHeader title="Hours & time off" />
      <Flash sp={sp} />
      <p className="mb-4 text-sm text-stone-600">
        {settings.sharedStaff
          ? "Bookings at one location block the same time at every location (one person works both). Change this in Settings."
          : "Each location has its own calendar; bookings only block their own location."}
      </p>
      <div className="space-y-6">
        {locations.map((l) => (
          <Card key={l.id} title={l.name}>
            <LocationForm loc={l} />
          </Card>
        ))}

        <Card title="Block off time">
          <p className="mb-3 text-sm text-stone-600">Vacations, appointments of your own, lunch: clients can&apos;t book over these.</p>
          <form key={`off-${off.length}`} action={addTimeOffAction} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_12rem]">
            <Field label="From" htmlFor="off-start">
              <input id="off-start" type="datetime-local" name="start" required step={300} className={inputCls} />
            </Field>
            <Field label="Until" htmlFor="off-end">
              <input id="off-end" type="datetime-local" name="end" required step={300} className={inputCls} />
            </Field>
            <Field label="Where" htmlFor="off-loc">
              <select id="off-loc" name="locationId" className={inputCls}>
                <option value="all">All locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <input name="reason" placeholder="Note (only you see this)" className={inputCls} aria-label="Reason" />
            </div>
            <SubmitButton className={btnSecondaryCls}>Block time</SubmitButton>
          </form>
          {off.length > 0 && (
            <ul className="mt-5 divide-y divide-stone-100 border-t border-stone-100 text-sm">
              {off.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="flex-1">
                    {DateTime.fromJSDate(o.startsAt).setZone(zone).toFormat("ccc LLL d, h:mm a")} → {DateTime.fromJSDate(o.endsAt).setZone(zone).toFormat("ccc LLL d, h:mm a")}
                    <span className="text-stone-500">
                      {" "}
                      · {locName(o.locationId)}
                      {o.reason && ` · ${o.reason}`}
                    </span>
                  </span>
                  <form action={deleteTimeOffAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <SubmitButton className="text-red-700 underline" pendingText="…">
                      Remove
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Special hours for a date">
          <p className="mb-3 text-sm text-stone-600">Open on a Sunday, close early for a holiday, or close a whole day. Replaces the weekly hours for that date.</p>
          <form key={`ov-${overrides.length}`} action={addOverrideAction} className="grid items-end gap-3 sm:grid-cols-[10rem_1fr_auto_12rem]">
            <Field label="Date" htmlFor="ov-date">
              <input id="ov-date" type="date" name="date" required min={today.toISODate()!} className={inputCls} />
            </Field>
            <Field label="Hours" htmlFor="ov-hours">
              <input id="ov-hours" name="hours" placeholder="e.g. 10:00-15:00" className={inputCls} />
            </Field>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="closed" /> Closed
            </label>
            <Field label="Where" htmlFor="ov-loc">
              <select id="ov-loc" name="locationId" className={inputCls}>
                <option value="all">All locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-3">
              <input name="note" placeholder="Note (optional)" className={inputCls} aria-label="Note" />
            </div>
            <SubmitButton className={btnSecondaryCls}>Save</SubmitButton>
          </form>
          {overrides.length > 0 && (
            <ul className="mt-5 divide-y divide-stone-100 border-t border-stone-100 text-sm">
              {overrides.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="flex-1">
                    {DateTime.fromISO(o.date).toFormat("ccc LLL d, yyyy")}: <strong>{o.intervals.length ? hoursText(o.intervals) : "Closed"}</strong>
                    <span className="text-stone-500">
                      {" "}
                      · {locName(o.locationId)}
                      {o.note && ` · ${o.note}`}
                    </span>
                  </span>
                  <form action={deleteOverrideAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <SubmitButton className="text-red-700 underline" pendingText="…">
                      Remove
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Add a location">
          <LocationForm key={`loc-${locations.length}`} />
        </Card>
      </div>
    </>
  );
}
