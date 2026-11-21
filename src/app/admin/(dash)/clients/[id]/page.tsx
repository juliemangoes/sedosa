import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";
import { updateClientAction } from "../../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import { Card, DepositBadge, Field, Flash, PageHeader, StatusBadge, btnCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const db = await getDb();
  const c = await db.query.clients.findFirst({ where: eq(t.clients.id, Number(id)) });
  if (!c) notFound();
  const [appts, settings] = await Promise.all([
    db.select().from(t.appointments).where(eq(t.appointments.clientId, c.id)).orderBy(desc(t.appointments.startsAt)),
    getSettings(db),
  ]);
  const spent = appts.reduce((n, a) => n + a.amountPaidCents, 0);

  return (
    <>
      <Link href="/admin/clients" className="text-sm text-stone-600 hover:text-plum">
        ‹ Clients
      </Link>
      <PageHeader title={`${c.firstName} ${c.lastName}`}>
        <Link href={`/admin/appointments/new?client=${c.id}`} className={btnCls}>
          + Book for this client
        </Link>
      </PageHeader>
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card title={`Appointments (${appts.length})`}>
          <p className="mb-3 text-sm text-stone-600">Total paid: {money(spent)}</p>
          <ul className="divide-y divide-stone-100">
            {appts.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/appointments/${a.id}`} className="flex flex-wrap items-center gap-2 py-2.5 text-sm hover:bg-stone-50">
                  <span className="w-44 tabular-nums">{DateTime.fromJSDate(a.startsAt).setZone(settings.timezone).toFormat("ccc LLL d, yyyy h:mm a")}</span>
                  <span className="flex-1">{a.snapshot.serviceName}</span>
                  <StatusBadge status={a.status} />
                  <DepositBadge status={a.depositStatus} cents={a.depositCents} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Details">
          <form action={updateClientAction} className="space-y-3">
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
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="smsOptIn" defaultChecked={c.smsOptIn} /> Opted in to text messages
            </label>
            <Field label="Private notes" htmlFor="notes" hint="Allergies, preferences, brow shape… only you see this.">
              <textarea id="notes" name="notes" rows={4} defaultValue={c.notes} className={inputCls} />
            </Field>
            <SubmitButton className={btnCls}>Save</SubmitButton>
            <p className="text-xs text-stone-500">
              Client since {DateTime.fromJSDate(c.createdAt).setZone(settings.timezone).toFormat("LLL yyyy")}
              {c.stripePaymentMethodId && " · card on file"}
            </p>
          </form>
        </Card>
      </div>
    </>
  );
}
