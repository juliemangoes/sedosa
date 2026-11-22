import type { ReactNode } from "react";
import type { AppointmentStatus, DepositStatus } from "@/db/schema";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-[1.9rem] font-semibold leading-tight tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions, subtitle }: { title?: string; subtitle?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(28,16,24,0.04),0_8px_24px_-18px_rgba(28,16,24,0.25)] ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[0.98rem] font-semibold text-stone-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** KPI tile. */
export function Stat({ label, value, hint, tone = "default", icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "good" | "bad" | "brand"; icon?: ReactNode }) {
  const toneCls =
    tone === "brand"
      ? "bg-noir text-white border-noir"
      : tone === "good"
        ? "bg-white border-emerald-200"
        : tone === "bad"
          ? "bg-white border-rose-200"
          : "bg-white border-stone-200/80";
  return (
    <div className={`rounded-2xl border p-4 shadow-[0_1px_2px_rgba(28,16,24,0.04)] sm:p-5 ${toneCls}`}>
      <p className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${tone === "brand" ? "text-[#e9c9de]" : "text-stone-500"}`}>
        {icon}
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums sm:text-[1.7rem] ${tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : ""}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs ${tone === "brand" ? "text-[#e9c9de]" : "text-stone-500"}`}>{hint}</p>}
    </div>
  );
}

export function Avatar({ first, last, size = "md" }: { first: string; last: string; size?: "sm" | "md" | "lg" }) {
  const initials = `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase() || "?";
  const hue = [...`${first}${last}`].reduce((n, ch) => n + ch.charCodeAt(0), 0) % 4;
  const tones = ["bg-plum/10 text-plum", "bg-neon/15 text-[#9c2a73]", "bg-amber-100 text-amber-900", "bg-sky-100 text-sky-900"];
  const sz = size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-14 text-lg" : "size-10 text-sm";
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full font-semibold ${sz} ${tones[hue]}`}>
      {initials}
    </span>
  );
}

export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  if (!notice && !error) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
    >
      <span aria-hidden="true">{error ? "⚠" : "✓"}</span>
      {error ?? notice}
    </div>
  );
}

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-emerald-100 text-emerald-900",
  completed: "bg-stone-200 text-stone-800",
  no_show: "bg-rose-100 text-rose-900",
  cancelled: "bg-stone-100 text-stone-500 line-through",
  expired: "bg-stone-100 text-stone-500",
};
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Awaiting deposit",
  confirmed: "Confirmed",
  completed: "Completed",
  no_show: "No-show",
  cancelled: "Canceled",
  expired: "Expired",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function DepositBadge({ status, cents }: { status: DepositStatus; cents: number }) {
  if (status === "none") return null;
  const style =
    status === "paid" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : status === "waived" ? "bg-stone-50 text-stone-600 ring-stone-200" : "bg-amber-50 text-amber-900 ring-amber-300";
  const label = status === "paid" ? "Deposit paid" : status === "waived" ? "Deposit waived" : `Deposit due $${(cents / 100).toFixed(0)}`;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ring-1 ${style}`}>{label}</span>;
}

export const inputCls =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm transition focus:border-plum focus:outline-none focus:ring-4 focus:ring-plum/15";
export const labelCls = "mb-1.5 block text-sm font-medium text-stone-700";
export const btnCls =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-plum px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#5b2256] active:scale-[0.98] disabled:opacity-50";
export const btnSecondaryCls =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-stone-50 active:scale-[0.98] disabled:opacity-50";
export const btnDangerCls =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-medium text-rose-800 transition hover:bg-rose-50 active:scale-[0.98] disabled:opacity-50";
export const btnWhatsAppCls =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#075e54] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#054c44] active:scale-[0.98] disabled:opacity-50";

export function Field({ label, children, hint, htmlFor }: { label: string; children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div>
      <label className={labelCls} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-stone-500">
      {icon && <span className="grid size-11 place-items-center rounded-full bg-stone-100 text-stone-400">{icon}</span>}
      {children}
    </div>
  );
}
