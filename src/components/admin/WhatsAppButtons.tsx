"use client";

import { useEffect, useRef, useState } from "react";
import { WhatsAppIcon } from "./icons";
import SubmitButton from "./SubmitButton";

/** Opens WhatsApp with the reminder and marks it sent, in one tap. */
export function SendReminderButton({ href, id, back, action }: { href: string; id: number; back: string; action: (fd: FormData) => void | Promise<void> }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      <span onClickCapture={() => window.open(href, "_blank", "noopener")}>
        <SubmitButton className="inline-flex items-center gap-1.5 rounded-full bg-[#075e54] px-3 py-2 text-xs font-medium text-panel hover:bg-[#054c44]" pendingText="Opening…">
          <WhatsAppIcon size={15} /> Send
        </SubmitButton>
      </span>
    </form>
  );
}

/** WhatsApp button with a menu of ready-written messages. */
export function WhatsAppMenu({ templates, className = "", label = "WhatsApp", compact }: { templates: { label: string; text: string; href: string }[]; className?: string; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  if (!templates.length) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={className || "inline-flex items-center gap-2 rounded-full bg-[#075e54] px-4 py-2.5 text-sm font-medium text-panel shadow-sm transition hover:bg-[#054c44]"}
      >
        <WhatsAppIcon size={compact ? 16 : 18} /> {label}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-dialog-in overflow-hidden rounded-2xl border border-line bg-panel text-left shadow-xl">
          <p className="border-b border-line px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-ink-soft">Send a message</p>
          <ul className="max-h-80 overflow-y-auto py-1">
            {templates.map((t) => (
              <li key={t.label}>
                <a role="menuitem" href={t.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-plaster">
                  <span className="text-sm font-medium text-ink">{t.label}</span>
                  <span className="mt-0.5 line-clamp-2 text-xs text-ink-soft [overflow-wrap:anywhere]">{t.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
