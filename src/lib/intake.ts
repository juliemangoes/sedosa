import type { FieldType, IntakeAnswer } from "@/db/schema";

export type FormWithFields = {
  id: number;
  name: string;
  description: string;
  fields: { id: number; type: FieldType; label: string; options: string[]; required: boolean }[];
};

export type RawAnswers = Record<string, unknown>;

/**
 * Validates submitted intake answers against the service's forms.
 * Returns normalized answers plus per-field error messages keyed by field id.
 */
export function validateAnswers(forms: FormWithFields[], raw: RawAnswers) {
  const answers: IntakeAnswer[] = [];
  const errors: Record<string, string> = {};

  for (const form of forms) {
    for (const f of form.fields) {
      const key = String(f.id);
      const v = raw[key];
      let value: IntakeAnswer["value"] | undefined;

      switch (f.type) {
        case "yesno":
          if (v === "yes" || v === "no") value = v;
          break;
        case "checkbox":
          value = v === true || v === "true" || v === "on";
          if (!value && !f.required) value = false;
          if (!value && f.required) value = undefined;
          break;
        case "checkboxlist": {
          const arr = Array.isArray(v) ? v.map(String).filter((x) => f.options.includes(x)) : [];
          value = arr.length ? arr : undefined;
          break;
        }
        case "dropdown":
          if (typeof v === "string" && f.options.includes(v)) value = v;
          break;
        case "text":
        case "textarea":
          if (typeof v === "string" && v.trim()) value = v.trim().slice(0, 5000);
          break;
      }

      if (value === undefined) {
        if (f.required) {
          errors[key] = f.type === "checkbox" ? "Please check this box to continue." : "This question is required.";
        }
        continue;
      }
      answers.push({ formId: form.id, formName: form.name, fieldId: f.id, label: f.label, type: f.type, value });
    }
  }
  return { answers, errors, ok: Object.keys(errors).length === 0 };
}

export function answerText(a: IntakeAnswer): string {
  if (Array.isArray(a.value)) return a.value.join(", ");
  if (typeof a.value === "boolean") return a.value ? "Agreed" : "Not checked";
  if (a.value === "yes") return "Yes";
  if (a.value === "no") return "No";
  return a.value;
}
