import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { loadCatalog } from "@/lib/catalog";
import { deleteFieldAction, deleteFormAction, saveFieldAction, saveFormAction } from "../../../actions";
import SubmitButton from "@/components/admin/SubmitButton";
import { Card, Field, Flash, PageHeader, btnCls, btnDangerCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";
import type { FieldType } from "@/db/schema";

export const dynamic = "force-dynamic";

const TYPES: [FieldType, string][] = [
  ["yesno", "Yes / No"],
  ["checkbox", "Single checkbox (agreement)"],
  ["checkboxlist", "Checkboxes (pick any)"],
  ["dropdown", "Dropdown (pick one)"],
  ["text", "Short answer"],
  ["textarea", "Long answer"],
];

type FieldRow = { id: number; type: FieldType; label: string; options: string[]; required: boolean };

function FieldForm({ formId, f, order }: { formId: number; f?: FieldRow; order: number }) {
  return (
    <form action={saveFieldAction} className="grid gap-3 border-b border-stone-100 py-4 last:border-0 md:grid-cols-[1fr_14rem]">
      <input type="hidden" name="formId" value={formId} />
      <input type="hidden" name="id" value={f?.id ?? ""} />
      <div className="space-y-2">
        <textarea name="label" rows={2} defaultValue={f?.label} required placeholder="Question or statement" className={inputCls} aria-label="Question" />
        <textarea name="options" rows={2} defaultValue={f?.options.join("\n")} placeholder="Options, one per line (checkboxes / dropdown only)" className={`${inputCls} text-xs`} aria-label="Options" />
      </div>
      <div className="space-y-2">
        <select name="type" defaultValue={f?.type ?? "yesno"} className={inputCls} aria-label="Answer type">
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="required" defaultChecked={f?.required ?? true} /> Required
          </label>
          <input name="sortOrder" type="number" defaultValue={order} className={`${inputCls} w-16`} aria-label="Order" title="Order" />
        </div>
        <div className="flex gap-2">
          <SubmitButton className={f ? btnSecondaryCls : btnCls}>{f ? "Save" : "Add question"}</SubmitButton>
          {f && (
            <SubmitButton className="px-2 text-sm text-red-700 underline" formAction={deleteFieldAction} confirm="Delete this question?" pendingText="…">
              Delete
            </SubmitButton>
          )}
        </div>
      </div>
    </form>
  );
}

export default async function FormEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const db = await getDb();
  const catalog = await loadCatalog(db);
  const form = catalog.forms.find((f) => f.id === Number(id));
  if (!form) notFound();
  const sortOrder = catalog.forms.findIndex((f) => f.id === form.id);
  return (
    <>
      <Link href="/admin/forms" className="text-sm text-stone-600 hover:text-plum">
        ‹ Forms
      </Link>
      <PageHeader title={form.name} />
      <Flash sp={sp} />
      <div className="space-y-6">
        <Card>
          <form action={saveFormAction} className="space-y-3">
            <input type="hidden" name="id" value={form.id} />
            <input type="hidden" name="sortOrder" value={sortOrder} />
            <Field label="Form name" htmlFor="name">
              <input id="name" name="name" defaultValue={form.name} required className={inputCls} />
            </Field>
            <Field label="Intro / waiver text" htmlFor="description" hint="Shown above the questions in a scrollable box.">
              <textarea id="description" name="description" rows={8} defaultValue={form.description} className={inputCls} />
            </Field>
            <SubmitButton className={btnCls}>Save form</SubmitButton>
          </form>
        </Card>
        <Card title="Questions">
          {form.fields.map((f, i) => (
            <FieldForm key={f.id} formId={form.id} f={f} order={i} />
          ))}
          <h3 className="mt-4 text-sm font-semibold">Add a question</h3>
          <FieldForm key={`new-${form.fields.length}`} formId={form.id} order={form.fields.length} />
        </Card>
        <form action={deleteFormAction}>
          <input type="hidden" name="id" value={form.id} />
          <SubmitButton className={btnDangerCls} confirm="Delete this form? Past answers stay on old appointments.">
            Delete form
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
