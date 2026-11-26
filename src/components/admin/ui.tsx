import type { ReactNode } from "react";
import Link from "next/link";
import type { AppointmentStatus, DepositStatus } from "@/db/schema";

/*
 * The back office of the powder room: plaster ground, rose-white panels, oxblood ink,
 * Jost for everything you operate and Bodoni only for page titles and headline figures.
 */

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[2.3rem] font-medium leading-[1.05] text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions, subtitle }: { title?: string; subtitle?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-[1.25rem] bg-panel p-5 shadow-[0_1px_0_rgba(58,15,28,0.04),0_14px_30px_-24px_rgba(58,15,28,0.45)] ring-1 ring-line ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[1rem] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Headline figure. The number is set in Bodoni, like a reservation ledger. */
export function Stat({ label, value, hint, tone = "default", icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "good" | "bad" | "brand"; icon?: ReactNode }) {
  const brand = tone === "brand";
  const toneCls = brand ? "on-dark bg-oxblood text-plaster ring-oxblood" : tone === "good" ? "bg-panel ring-[#1f6b4a]/30" : tone === "bad" ? "bg-panel ring-[#a61b2b]/30" : "bg-panel ring-line";
  return (
    <div className={`rounded-[1.25rem] p-4 shadow-[0_14px_30px_-24px_rgba(58,15,28,0.45)] ring-1 sm:p-5 ${toneCls}`}>
      <p className={`flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] ${brand ? "text-brass-light" : "text-ink-soft"}`}>
        {icon}
        {label}
      </p>
      <p className={`font-display mt-2 text-[2rem] font-medium leading-none tabular-nums sm:text-[2.2rem] ${tone === "good" ? "text-[#1f6b4a]" : tone === "bad" ? "text-[#a61b2b]" : ""}`}>{value}</p>
      {hint && <p className={`mt-2 text-xs ${brand ? "text-plaster" : "text-ink-soft"}`}>{hint}</p>}
    </div>
  );
}

export function Avatar({ first, last, size = "md" }: { first: string; last: string; size?: "sm" | "md" | "lg" }) {
  const initials = `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase() || "?";
  const hue = [...`${first}${last}`].reduce((n, ch) => n + ch.charCodeAt(0), 0) % 3;
  const tones = ["bg-rose text-oxblood", "bg-brass-light text-oxblood", "bg-plaster-2 text-lacquer"];
  const sz = size === "sm" ? "size-8 text-sm" : size === "lg" ? "size-14 text-xl" : "size-10 text-base";
  return (
    <span aria-hidden="true" className={`font-display grid shrink-0 place-items-center rounded-full font-medium ${sz} ${tones[hue]}`}>
      {initials}
    </span>
  );
}

const IconOk = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px shrink-0">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
const IconWarn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px shrink-0">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </svg>
);

export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  if (!notice && !error) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-6 flex items-start gap-2.5 rounded-2xl bg-panel px-4 py-3 text-sm font-medium ring-1 ${error ? "text-[#a61b2b] ring-[#a61b2b]/40" : "text-[#1f6b4a] ring-[#1f6b4a]/40"}`}
    >
      {error ? <IconWarn /> : <IconOk />}
      {error ?? notice}
    </div>
  );
}

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  pending: "text-[#7a4a00] ring-[#7a4a00]/40",
  confirmed: "text-[#1f6b4a] ring-[#1f6b4a]/40",
  completed: "text-ink-soft ring-line-strong",
  no_show: "text-[#a61b2b] ring-[#a61b2b]/40",
  cancelled: "text-ink-soft ring-line line-through",
  expired: "text-ink-soft ring-line",
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
  return <span className={`inline-block whitespace-nowrap rounded-full bg-panel px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function DepositBadge({ status, cents }: { status: DepositStatus; cents: number }) {
  if (status === "none") return null;
  const style = status === "paid" ? "text-[#1f6b4a] ring-[#1f6b4a]/40" : status === "waived" ? "text-ink-soft ring-line-strong" : "bg-[#fbe9c8] text-[#7a4a00] ring-[#7a4a00]/30";
  const label = status === "paid" ? "Deposit paid" : status === "waived" ? "Deposit waived" : `Deposit due $${(cents / 100).toFixed(0)}`;
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${style}`}>{label}</span>;
}

export const inputCls =
  "w-full rounded-xl border border-line-strong bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft transition hover:border-lacquer focus:border-lacquer focus:outline-none focus:ring-4 focus:ring-lacquer/15";
export const labelCls = "mb-1.5 block text-sm font-medium text-ink";
export const btnCls =
  "inline-flex items-center justify-center gap-2 rounded-full bg-oxblood px-4 py-2.5 text-sm font-medium text-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_14px_-8px_rgba(58,15,28,0.6)] transition hover:bg-oxblood-2 active:scale-[0.98] disabled:opacity-50";
export const btnSecondaryCls =
  "inline-flex items-center justify-center gap-2 rounded-full bg-panel px-4 py-2.5 text-sm font-medium text-ink ring-1 ring-line-strong transition hover:bg-plaster hover:ring-lacquer active:scale-[0.98] disabled:opacity-50";
export const btnDangerCls =
  "inline-flex items-center justify-center gap-2 rounded-full bg-panel px-4 py-2.5 text-sm font-medium text-[#a61b2b] ring-1 ring-[#a61b2b]/45 transition hover:bg-[#fbe4e6] active:scale-[0.98] disabled:opacity-50";
export const btnWhatsAppCls =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#075e54] px-4 py-2.5 text-sm font-medium text-panel shadow-sm transition hover:bg-[#054c44] active:scale-[0.98] disabled:opacity-50";

export function Field({ label, children, hint, htmlFor }: { label: string; children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div>
      <label className={labelCls} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-8 text-center text-sm text-ink-soft">
      {icon && <span className="text-lacquer">{icon}</span>}
      {children}
    </div>
  );
}

/** "Back to …" link with a drawn chevron. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={`Back to ${label}`} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-lacquer">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 5-7 7 7 7" />
      </svg>
      {label}
    </Link>
  );
}
