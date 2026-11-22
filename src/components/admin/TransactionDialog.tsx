"use client";

import { useRef, useState } from "react";
import { saveTransactionAction, deleteTransactionAction } from "@/app/admin/actions";
import SubmitButton from "./SubmitButton";
import ImageUpload from "./ImageUpload";
import { btnCls, btnDangerCls, btnSecondaryCls, inputCls, labelCls } from "./ui";

export type TxDraft = {
  id?: number;
  kind: "income" | "expense";
  date: string;
  amountCents?: number;
  category?: string;
  method?: string;
  description?: string;
  recurringMonthly?: boolean;
  receiptMediaId?: number | null;
};

type Props = {
  draft: TxDraft;
  expenseCategories: readonly string[];
  incomeCategories: readonly string[];
  methods: Record<string, string>;
  back: string;
  trigger: React.ReactNode;
  triggerClassName: string;
  triggerLabel?: string;
};

export default function TransactionDialog({ draft, expenseCategories, incomeCategories, methods, back, trigger, triggerClassName, triggerLabel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [receipt, setReceipt] = useState<number | null>(draft.receiptMediaId ?? null);
  const isExpense = draft.kind === "expense";
  const cats = isExpense ? expenseCategories : incomeCategories;
  const title = `${draft.id ? "Edit" : "Add"} ${isExpense ? "expense" : "income"}`;
  const pre = (id: string) => `${draft.id ?? "new"}-${draft.kind}-${id}`;

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => ref.current?.showModal()} aria-label={triggerLabel}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-0 mt-auto max-h-[92svh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-white p-0 font-sans text-stone-900 shadow-2xl backdrop:bg-black/40 open:animate-sheet-up sm:m-auto sm:max-w-lg sm:rounded-3xl sm:open:animate-dialog-in"
      >
        <form action={saveTransactionAction} className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold">{title}</h2>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-stone-100">
              ✕
            </button>
          </div>
          <input type="hidden" name="id" value={draft.id ?? ""} />
          <input type="hidden" name="kind" value={draft.kind} />
          <input type="hidden" name="back" value={back} />
          <input type="hidden" name="receiptMediaId" value={receipt ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={pre("amount")} className={labelCls}>
                Amount ($)
              </label>
              <input id={pre("amount")} name="amount" inputMode="decimal" required autoFocus defaultValue={draft.amountCents ? (draft.amountCents / 100).toFixed(2) : ""} placeholder="0.00" className={`${inputCls} text-lg font-semibold`} />
            </div>
            <div>
              <label htmlFor={pre("date")} className={labelCls}>
                Date
              </label>
              <input id={pre("date")} name="date" type="date" required defaultValue={draft.date} className={inputCls} />
            </div>
          </div>
          <div>
            <label htmlFor={pre("desc")} className={labelCls}>
              {isExpense ? "What was it for?" : "Description"}
            </label>
            <input id={pre("desc")} name="description" defaultValue={draft.description} placeholder={isExpense ? "e.g. Lash lift kit, Sally Beauty" : "e.g. Brow serum sale"} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={pre("cat")} className={labelCls}>
                Category
              </label>
              <select id={pre("cat")} name="category" defaultValue={draft.category ?? cats[0]} className={inputCls}>
                {cats.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={pre("method")} className={labelCls}>
                Paid with
              </label>
              <select id={pre("method")} name="method" defaultValue={draft.method ?? (isExpense ? "card" : "cash")} className={inputCls}>
                {Object.entries(methods)
                  .filter(([k]) => k !== "stripe")
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          {isExpense && (
            <>
              {!draft.id && (
                <label className="flex items-start gap-2.5 rounded-xl bg-stone-50 p-3 text-sm">
                  <input type="checkbox" name="recurringMonthly" defaultChecked={draft.recurringMonthly} className="mt-0.5 size-4 accent-[#6d2b67]" />
                  <span>
                    <span className="font-medium">Repeats every month</span>
                    <span className="block text-xs text-stone-500">Rent, software, phone… Log it again each month with one tap.</span>
                  </span>
                </label>
              )}
              <div>
                <span className={labelCls}>Receipt (optional)</span>
                <ImageUpload kind="receipt" currentUrl={receipt ? `/api/media/${receipt}` : null} label="receipt photo" onUploaded={(id) => setReceipt(id)} />
              </div>
            </>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {draft.id ? (
              <SubmitButton className={btnDangerCls} formAction={deleteTransactionAction} confirm="Delete this entry?" pendingText="Deleting…">
                Delete
              </SubmitButton>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className={btnSecondaryCls} onClick={() => ref.current?.close()}>
                Cancel
              </button>
              <SubmitButton className={btnCls}>Save</SubmitButton>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
