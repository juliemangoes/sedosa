import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { deleteAddonAction, saveAddonAction } from "../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import { Card, Flash, PageHeader, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

function Row({ a }: { a?: typeof t.addons.$inferSelect }) {
  return (
    <form action={saveAddonAction} className="grid items-end gap-2 border-b border-stone-100 py-3 last:border-0 sm:grid-cols-[1fr_6rem_6rem_5rem_auto_auto]">
      <input type="hidden" name="id" value={a?.id ?? ""} />
      <label className="text-xs text-stone-500">
        Name
        <input name="name" defaultValue={a?.name} required className={inputCls} />
      </label>
      <label className="text-xs text-stone-500">
        Minutes
        <input name="durationMin" type="number" min={0} step={5} defaultValue={a?.durationMin ?? 10} className={inputCls} />
      </label>
      <label className="text-xs text-stone-500">
        Price ($)
        <input name="price" inputMode="decimal" defaultValue={a ? (a.priceCents / 100).toFixed(2) : ""} className={inputCls} />
      </label>
      <label className="text-xs text-stone-500">
        Order
        <input name="sortOrder" type="number" defaultValue={a?.sortOrder ?? 0} className={inputCls} />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={a?.active ?? true} /> On
      </label>
      <div className="flex gap-2">
        <SubmitButton className={a ? btnSecondaryCls : btnCls}>{a ? "Save" : "Add"}</SubmitButton>
        {a && (
          <SubmitButton className="px-2 text-sm text-red-700 underline" confirm={`Delete "${a.name}"?`} pendingText="…" formAction={deleteAddonAction}>
            Delete
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

export default async function AddonsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const addons = await db.select().from(t.addons).orderBy(asc(t.addons.sortOrder), asc(t.addons.id));
  return (
    <>
      <PageHeader title="Add-ons" />
      <Flash sp={sp} />
      <p className="mb-4 text-sm text-stone-600">Extras clients can tick on the date &amp; time step. Choose which services offer each add-on on the service&apos;s page.</p>
      <Card>
        {addons.map((a) => (
          <Row key={a.id} a={a} />
        ))}
      </Card>
      <Card title="New add-on" className="mt-6">
        <Row key={`new-${addons.length}`} />
      </Card>
    </>
  );
}
