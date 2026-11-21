"use client";

import type { PublicForm } from "./types";

type Props = {
  forms: PublicForm[];
  answers: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldId: number, value: unknown) => void;
};

export default function IntakeForm({ forms, answers, errors, onChange }: Props) {
  return (
    <>
      {forms.map((form) => (
        <fieldset key={form.id} className="mt-8 border-t border-petal-line pt-6">
          <legend className="sr-only">{form.name}</legend>
          <h3 className="text-lg font-semibold text-plum">{form.name}</h3>
          {form.description && (
            <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line rounded-sm bg-white/50 p-3 text-sm leading-relaxed">
              {form.description}
            </div>
          )}
          <div className="mt-4 space-y-5">
            {form.fields.map((f) => {
              const key = String(f.id);
              const err = errors[key];
              const id = `f-${f.id}`;
              const req = f.required ? <span aria-hidden="true"> *</span> : null;
              const errEl = err ? (
                <p id={`${id}-err`} className="mt-1 text-sm text-red-800" data-error>
                  {err}
                </p>
              ) : null;
              const describedBy = err ? `${id}-err` : undefined;

              if (f.type === "checkbox") {
                return (
                  <div key={f.id}>
                    <label className="flex items-start gap-3 text-[0.95rem]">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-black"
                        checked={answers[key] === true}
                        onChange={(e) => onChange(f.id, e.target.checked)}
                        aria-invalid={!!err}
                        aria-describedby={describedBy}
                      />
                      <span>
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
                  <div key={f.id} role="radiogroup" aria-labelledby={`${id}-l`} aria-describedby={describedBy}>
                    <p id={`${id}-l`} className="text-[0.95rem]">
                      {f.label}
                      {req}
                    </p>
                    <div className="mt-1.5 flex gap-6">
                      {(["yes", "no"] as const).map((v) => (
                        <label key={v} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={id}
                            className="size-4 accent-black"
                            checked={answers[key] === v}
                            onChange={() => onChange(f.id, v)}
                          />
                          {v === "yes" ? "Yes" : "No"}
                        </label>
                      ))}
                    </div>
                    {errEl}
                  </div>
                );
              }
              if (f.type === "checkboxlist") {
                const cur = Array.isArray(answers[key]) ? (answers[key] as string[]) : [];
                return (
                  <div key={f.id} role="group" aria-labelledby={`${id}-l`} aria-describedby={describedBy}>
                    <p id={`${id}-l`} className="text-[0.95rem]">
                      {f.label}
                      {req}
                    </p>
                    <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                      {f.options.map((o) => (
                        <label key={o} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="size-4 accent-black"
                            checked={cur.includes(o)}
                            onChange={(e) => onChange(f.id, e.target.checked ? [...cur, o] : cur.filter((x) => x !== o))}
                          />
                          {o}
                        </label>
                      ))}
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
                    <select
                      id={id}
                      className="field mt-1.5"
                      value={(answers[key] as string) ?? ""}
                      onChange={(e) => onChange(f.id, e.target.value)}
                      aria-invalid={!!err}
                      aria-describedby={describedBy}
                    >
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
                    className="field mt-1.5"
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
      ))}
    </>
  );
}
