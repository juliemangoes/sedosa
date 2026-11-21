import Link from "next/link";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { loadCatalog } from "@/lib/catalog";
import { duration, money } from "@/lib/format";
import { deleteCategoryAction, saveCategoryAction } from "../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import { Card, Flash, PageHeader, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const catalog = await loadCatalog(db);
  return (
    <>
      <PageHeader title="Services">
        <Link href="/admin/services/new" className={btnCls}>
          + New service
        </Link>
      </PageHeader>
      <Flash sp={sp} />
      <div className="space-y-6">
        {catalog.categories.map((cat) => (
          <Card key={cat.id}>
            <form action={saveCategoryAction} className="mb-4 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={cat.id} />
              <input name="name" defaultValue={cat.name} className={`${inputCls} max-w-xs font-semibold`} aria-label="Category name" />
              <input name="sortOrder" type="number" defaultValue={cat.sortOrder} className={`${inputCls} w-20`} aria-label="Order" title="Display order" />
              <SubmitButton className={btnSecondaryCls}>Rename</SubmitButton>
            </form>
            {cat.services.length === 0 ? (
              <form action={deleteCategoryAction}>
                <input type="hidden" name="id" value={cat.id} />
                <p className="text-sm text-stone-500">
                  No services.{" "}
                  <SubmitButton className="underline" confirm="Delete this category?">
                    Delete category
                  </SubmitButton>
                </p>
              </form>
            ) : (
              <ul className="divide-y divide-stone-100">
                {cat.services.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/services/${s.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm hover:bg-stone-50">
                      <span className={`flex-1 font-medium ${s.active ? "" : "text-stone-400 line-through"}`}>{s.name}</span>
                      <span className="text-stone-600">{duration(s.durationMin)}</span>
                      <span className="w-20 text-right tabular-nums">{money(s.priceCents)}</span>
                      <span className="w-28 text-right text-xs text-stone-500">{s.depositCents ? `${money(s.depositCents)} deposit` : "no deposit"}</span>
                      {s.private && <span className="rounded-full bg-stone-100 px-2 text-xs">private</span>}
                      {!s.active && <span className="rounded-full bg-stone-100 px-2 text-xs">off</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
        <Card title="Add a category">
          <form key={`cat-${catalog.categories.length}`} action={saveCategoryAction} className="flex flex-wrap gap-2">
            <input name="name" placeholder="e.g. Facials" className={`${inputCls} max-w-xs`} aria-label="New category name" required />
            <input name="sortOrder" type="number" defaultValue={catalog.categories.length} className={`${inputCls} w-20`} aria-label="Order" />
            <SubmitButton className={btnSecondaryCls}>Add category</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
