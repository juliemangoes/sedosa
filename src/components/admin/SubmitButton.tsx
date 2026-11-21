"use client";

import { useFormStatus } from "react-dom";

/** Submit button that shows progress and can ask for confirmation first. */
export default function SubmitButton({
  children,
  className,
  confirm,
  name,
  value,
  pendingText = "Saving…",
  formAction,
}: {
  children: React.ReactNode;
  className: string;
  confirm?: string;
  name?: string;
  value?: string;
  pendingText?: string;
  /** Submit this form to a different server action (e.g. a Delete button inside an edit form). */
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      disabled={pending}
      formAction={formAction}
      formNoValidate={!!formAction}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
