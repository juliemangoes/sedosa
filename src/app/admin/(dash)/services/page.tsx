import Link from "next/link";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { loadCatalog } from "@/lib/catalog";
import { duration, money } from "@/lib/format";
import { deleteCategoryAction, removeCategoryImageAction, saveCategoryAction } from "../../actions";
import ImageUpload from "@/components/admin/ImageUpload";
import { mediaUrl } from "@/lib/media";
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
            <div className="mb-5 grid gap-4 border-b border-line pb-5 md:grid-cols-[auto_1fr]">
              <ImageUpload kind="category" categoryId={cat.id} currentUrl={mediaUrl(cat.imageId)} label={`${cat.name} photo`} removeAction={removeCategoryImageAction} />
              <form key={`${cat.name}-${cat.description}-${cat.sortOrder}`} action={saveCategoryAction} className="grid gap-2 sm:grid-cols-[1fr_5rem_auto] sm:items-start">
                <input type="hidden" name="id" value={cat.id} />
                <input name="name" defaultValue={cat.name} className={`${inputCls} font-semibold`} aria-label="Category name" />
                <input name="sortOrder" type="number" defaultValue={cat.sortOrder} className={inputCls} aria-label="Order" title="Display order" />
                <SubmitButton className={btnSecondaryCls}>Save</SubmitButton>
                <input
                  name="description"
                  defaultValue={cat.description}
                  maxLength={140}
                  placeholder="Short line for the menu card, e.g. Lamination, tints & sculpting"
                  className={`${inputCls} sm:col-span-3`}
                  aria-label="Card description"
                />
              </form>
            </div>
            {cat.services.length === 0 ? (
              <form action={deleteCategoryAction}>
                <input type="hidden" name="id" value={cat.id} />
                <p className="text-sm text-ink-soft">
                  No services.{" "}
                  <SubmitButton className="underline" confirm="Delete this category?">
                    Delete category
                  </SubmitButton>
                </p>
              </form>
            ) : (
              <ul className="divide-y divide-line">
                {cat.services.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/services/${s.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm hover:bg-plaster">
                      <span className={`flex-1 font-medium ${s.active ? "" : "text-ink-soft line-through"}`}>{s.name}</span>
                      <span className="text-ink-soft">{duration(s.durationMin)}</span>
                      <span className="w-20 text-right tabular-nums">{money(s.priceCents)}</span>
                      <span className="w-28 text-right text-xs text-ink-soft">{s.depositCents ? `${money(s.depositCents)} deposit` : "no deposit"}</span>
                      {s.private && <span className="rounded-full bg-plaster-2 px-2 text-xs">private</span>}
                      {!s.active && <span className="rounded-full bg-plaster-2 px-2 text-xs">off</span>}
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
