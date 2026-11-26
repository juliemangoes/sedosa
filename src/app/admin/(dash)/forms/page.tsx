import Link from "next/link";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { loadCatalog } from "@/lib/catalog";
import { saveFormAction } from "../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import { Card, Flash, PageHeader, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function FormsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const catalog = await loadCatalog(db);
  return (
    <>
      <PageHeader title="Intake & consent forms" />
      <Flash sp={sp} />
      <p className="mb-4 text-sm text-ink-soft">Clients fill these in while booking. Attach forms to services on each service&apos;s page.</p>
      <Card>
        <ul className="divide-y divide-line">
          {catalog.forms.map((f) => {
            const used = catalog.services.filter((s) => s.formIds.includes(f.id)).length;
            return (
              <li key={f.id}>
                <Link href={`/admin/forms/${f.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:bg-plaster">
                  <span className="flex-1 font-medium">{f.name}</span>
                  <span className="text-sm text-ink-soft">{f.fields.length} questions</span>
                  <span className="text-sm text-ink-soft">used by {used} service{used === 1 ? "" : "s"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card title="New form" className="mt-6">
        <form action={saveFormAction} className="flex flex-wrap gap-2">
          <input name="name" required placeholder="e.g. Lash Lift Aftercare Acknowledgement" className={`${inputCls} max-w-md`} aria-label="Form name" />
          <SubmitButton className={btnSecondaryCls}>Create form</SubmitButton>
        </form>
      </Card>
    </>
  );
}
