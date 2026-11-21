import type { ReactNode } from "react";
import type { AppointmentStatus, DepositStatus } from "@/db/schema";

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-plum">{title}</h1>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-lg border border-stone-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  if (!notice && !error) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-5 rounded-md border px-4 py-3 text-sm ${error ? "border-red-300 bg-red-50 text-red-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}
    >
      {error ?? notice}
    </div>
  );
}

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-emerald-100 text-emerald-900",
  completed: "bg-stone-200 text-stone-800",
  no_show: "bg-red-100 text-red-900",
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
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-plum focus:outline-none focus:ring-2 focus:ring-plum/20";
export const labelCls = "mb-1 block text-sm font-medium text-stone-700";
export const btnCls = "inline-flex items-center justify-center rounded-md bg-plum px-4 py-2 text-sm font-medium text-white hover:bg-plum/90 disabled:opacity-50";
export const btnSecondaryCls =
  "inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50";
export const btnDangerCls =
  "inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50";

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

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-stone-500">{children}</p>;
}
