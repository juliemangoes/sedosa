"use client";

import type { PublicForm } from "./types";
import { IconCheck } from "@/components/landing/icons";

type Props = {
  forms: PublicForm[];
  answers: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldId: number, value: unknown) => void;
};

const pill = "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-plum has-[:focus-visible]:ring-offset-2";

export default function IntakeForm({ forms, answers, errors, onChange }: Props) {
  return (
    <>
      {forms.map((form) => {
        const required = form.fields.filter((f) => f.required);
        const answered = required.filter((f) => {
          const v = answers[String(f.id)];
          return f.type === "checkbox" ? v === true : f.type === "checkboxlist" ? Array.isArray(v) && v.length > 0 : !!v;
        }).length;
        return (
          <fieldset key={form.id} className="rounded-3xl bg-white/80 p-5 ring-1 ring-petal-line sm:p-7">
            <legend className="sr-only">{form.name}</legend>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-semibold">{form.name}</h3>
              {required.length > 0 && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${answered === required.length ? "bg-emerald-100 text-emerald-900" : "bg-blush text-plum"}`}>
                  {answered === required.length ? "Complete ✓" : `${answered} of ${required.length} answered`}
                </span>
              )}
            </div>
            {form.description && (
              <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-line rounded-2xl bg-blush/70 p-4 text-sm leading-relaxed" tabIndex={0} aria-label={`${form.name} terms`}>
                {form.description}
              </div>
            )}
            <div className="mt-5 space-y-6">
              {form.fields.map((f) => {
                const key = String(f.id);
                const err = errors[key];
                const id = `f-${f.id}`;
                const req = f.required ? <span aria-hidden="true" className="text-plum"> *</span> : null;
                const errEl = err ? (
                  <p id={`${id}-err`} className="mt-1.5 text-sm font-medium text-red-800" data-error>
                    {err}
                  </p>
                ) : null;
                const describedBy = err ? `${id}-err` : undefined;

                if (f.type === "checkbox") {
                  const on = answers[key] === true;
                  return (
                    <div key={f.id}>
                      <label className={`flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition ${on ? "bg-blush" : err ? "bg-red-50" : "bg-blush/40 hover:bg-blush/70"} ${pill}`}>
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={on}
                          onChange={(e) => onChange(f.id, e.target.checked)}
                          aria-invalid={!!err}
                          aria-describedby={describedBy}
                        />
                        <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ring-1 ${on ? "bg-black text-white ring-black" : "bg-white ring-ink/30"}`}>
                          {on && <IconCheck size={13} strokeWidth={3} />}
                        </span>
                        <span className="text-[0.95rem] leading-snug">
                          {f.label}
                          {req}
                        </span>
                      </label>
                      {errEl}
                    </div>
                  );
                }
                if (f.type === "yesno") {
                  return (
                    <div key={f.id} role="radiogroup" aria-labelledby={`${id}-l`} aria-describedby={describedBy} aria-required={f.required}>
                      <p id={`${id}-l`} className="text-[0.95rem] leading-snug">
                        {f.label}
                        {req}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {(["yes", "no"] as const).map((v) => {
                          const on = answers[key] === v;
                          return (
                            <label
                              key={v}
                              className={`min-w-20 cursor-pointer rounded-full px-5 py-2 text-center text-sm font-medium transition ${on ? "bg-black text-white" : "bg-white ring-1 ring-petal-line hover:ring-plum"} ${pill}`}
                            >
                              <input type="radio" name={id} className="sr-only" checked={on} onChange={() => onChange(f.id, v)} />
                              {v === "yes" ? "Yes" : "No"}
                            </label>
                          );
                        })}
                      </div>
                      {errEl}
                    </div>
                  );
                }
                if (f.type === "checkboxlist") {
                  const cur = Array.isArray(answers[key]) ? (answers[key] as string[]) : [];
                  return (
                    <div key={f.id} role="group" aria-labelledby={`${id}-l`} aria-describedby={describedBy}>
                      <p id={`${id}-l`} className="text-[0.95rem] leading-snug">
                        {f.label}
                        {req}
                        <span className="ml-1 text-sm text-ink/70">(choose any)</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {f.options.map((o) => {
                          const on = cur.includes(o);
                          return (
                            <label
                              key={o}
                              className={`cursor-pointer rounded-full px-4 py-2 text-sm transition ${on ? "bg-black text-white" : "bg-white ring-1 ring-petal-line hover:ring-plum"} ${pill}`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={on}
                                onChange={(e) => onChange(f.id, e.target.checked ? [...cur, o] : cur.filter((x) => x !== o))}
                              />
                              {on && "✓ "}
                              {o}
                            </label>
                          );
                        })}
                      </div>
                      {errEl}
                    </div>
                  );
                }
                if (f.type === "dropdown") {
                  return (
                    <div key={f.id}>
                      <label htmlFor={id} className="text-[0.95rem]">
                        {f.label}
                        {req}
                      </label>
                      <select id={id} className="field mt-2" value={(answers[key] as string) ?? ""} onChange={(e) => onChange(f.id, e.target.value)} aria-invalid={!!err} aria-describedby={describedBy}>
                        <option value="">Choose…</option>
                        {f.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                      {errEl}
                    </div>
                  );
                }
                const Tag = f.type === "textarea" ? "textarea" : "input";
                return (
                  <div key={f.id}>
                    <label htmlFor={id} className="text-[0.95rem]">
                      {f.label}
                      {req}
                    </label>
                    <Tag
                      id={id}
                      className="field mt-2"
                      value={(answers[key] as string) ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(f.id, e.target.value)}
                      aria-invalid={!!err}
                      aria-describedby={describedBy}
                      {...(f.type === "textarea" ? { rows: 3 } : {})}
                    />
                    {errEl}
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </>
  );
}
