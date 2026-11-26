import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { loadCatalog } from "@/lib/catalog";
import { money } from "@/lib/format";
import { deleteServiceAction, saveServiceAction } from "../../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import { BackLink, Card, Field, Flash, PageHeader, btnCls, btnDangerCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ServiceEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const db = await getDb();
  const catalog = await loadCatalog(db);
  const isNew = id === "new";
  const s = isNew ? null : catalog.services.find((x) => x.id === Number(id));
  if (!isNew && !s) notFound();
  const d = (n: number | undefined) => (n ? (n / 100).toFixed(2) : "");

  return (
    <>
      <BackLink href="/admin/services" label="Services" />
      <PageHeader title={s ? s.name : "New service"}>
        {s && (
          <a href={`/?service=${s.id}`} target="_blank" className="text-sm text-ink-soft underline">
            Direct booking link ↗
          </a>
        )}
      </PageHeader>
      <Flash sp={sp} />
      <form action={saveServiceAction} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <input type="hidden" name="id" value={s?.id ?? ""} />
        <Card>
          <div className="space-y-4">
            <Field label="Name" htmlFor="name">
              <input id="name" name="name" defaultValue={s?.name} required className={inputCls} />
            </Field>
            <Field label="Category" htmlFor="categoryId">
              <select id="categoryId" name="categoryId" defaultValue={s?.categoryId} className={inputCls}>
                {catalog.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description" htmlFor="description" hint="Shown on the booking page. Line breaks are kept.">
              <textarea id="description" name="description" rows={6} defaultValue={s?.description} className={inputCls} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Duration (minutes)" htmlFor="durationMin">
                <input id="durationMin" name="durationMin" type="number" min={5} step={5} defaultValue={s?.durationMin ?? 60} required className={inputCls} />
              </Field>
              <Field label="Price ($)" htmlFor="price">
                <input id="price" name="price" inputMode="decimal" defaultValue={d(s?.priceCents)} className={inputCls} />
              </Field>
              <Field label="Deposit ($)" htmlFor="deposit" hint="0 = no deposit">
                <input id="deposit" name="deposit" inputMode="decimal" defaultValue={s ? d(s.depositCents) : "10.00"} className={inputCls} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Buffer before (min)" htmlFor="paddingBeforeMin" hint="Setup time">
                <input id="paddingBeforeMin" name="paddingBeforeMin" type="number" min={0} step={5} defaultValue={s?.paddingBeforeMin ?? 0} className={inputCls} />
              </Field>
              <Field label="Buffer after (min)" htmlFor="paddingAfterMin" hint="Cleanup time">
                <input id="paddingAfterMin" name="paddingAfterMin" type="number" min={0} step={5} defaultValue={s?.paddingAfterMin ?? 0} className={inputCls} />
              </Field>
              <Field label="Display order" htmlFor="sortOrder">
                <input id="sortOrder" name="sortOrder" type="number" defaultValue={s?.sortOrder ?? 0} className={inputCls} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="active" defaultChecked={s?.active ?? true} /> Bookable
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="private" defaultChecked={s?.private ?? false} /> Private (hidden from the booking page; you can still book it)
              </label>
            </div>
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Locations">
            {catalog.locations.map((l) => (
              <label key={l.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" name="locationIds" value={l.id} defaultChecked={s ? s.locationIds.includes(l.id) : true} /> {l.name}
              </label>
            ))}
          </Card>
          <Card title="Add-ons offered">
            {catalog.addons.map((a) => (
              <label key={a.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" name="addonIds" value={a.id} defaultChecked={s?.addonIds.includes(a.id)} /> {a.name}
                <span className="text-ink-soft">{money(a.priceCents)}</span>
              </label>
            ))}
          </Card>
          <Card title="Intake forms">
            {catalog.forms.map((f) => (
              <label key={f.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" name="formIds" value={f.id} defaultChecked={s?.formIds.includes(f.id)} /> {f.name}
              </label>
            ))}
          </Card>
          <SubmitButton className={`${btnCls} w-full`}>Save service</SubmitButton>
        </div>
      </form>
      {s && (
        <form action={deleteServiceAction} className="mt-8">
          <input type="hidden" name="id" value={s.id} />
          <SubmitButton className={btnDangerCls} confirm="Delete this service? If it has past bookings it will be turned off instead.">
            Delete service
          </SubmitButton>
        </form>
      )}
    </>
  );
}
