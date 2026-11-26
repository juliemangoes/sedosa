"use client";

import { useEffect, useRef, useState } from "react";

type Month = { key: string; label: string; long: string; incomeCents: number; expenseCents: number };

// Validated pair on the panel surface #fff6f8 (dataviz validator): CVD ΔE 20.2, normal-vision 24.3, both ≥ 3:1.
const INCOME = "#9e2d5a"; // lacquer
const EXPENSE = "#b8862c"; // burnished brass

const usd = (c: number) => `${c < 0 ? "−" : ""}$${(Math.abs(c) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const compact = (c: number) => {
  const d = c / 100;
  return d >= 1000 ? `$${(d / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}K` : `$${d.toFixed(0)}`;
};

/** Round tick step (1, 2, 2.5 or 5 × 10ⁿ cents, at least $1) giving about four gridlines. */
function niceStep(v: number) {
  const raw = Math.max(100, v / 4);
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / exp;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * exp;
}

/** Income vs expenses per month: grouped columns, one tooltip per month, table view. */
export default function FinanceChart({ months }: { months: Month[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the container's real width so text stays 11px on phones instead of scaling down.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 200 : 240;
  const pad = { top: 12, right: 4, bottom: 28, left: 44 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const peak = Math.max(...months.map((m) => Math.max(m.incomeCents, m.expenseCents)), 0) || 10_000;
  const step = niceStep(peak);
  const max = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const band = plotW / months.length;
  const barW = Math.min(24, (band - 18) / 2);
  const y = (c: number) => pad.top + plotH - (c / max) * plotH;

  const bar = (x: number, cents: number, color: string, dim: boolean) => {
    const h = Math.max(0, (cents / max) * plotH);
    if (h <= 0) return null;
    const r = Math.min(4, h, barW / 2);
    const top = pad.top + plotH - h;
    const base = pad.top + plotH;
    // 4px rounded data-end, square at the baseline.
    const d = `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${base} Z`;
    return <path d={d} fill={color} opacity={dim ? 0.35 : 1} style={{ transition: "opacity 150ms" }} />;
  };

  const h = hover !== null ? months[hover] : null;
  const tipLeft = hover !== null ? ((pad.left + band * hover + band / 2) / W) * 100 : 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-[3px]" style={{ background: INCOME }} /> Income
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-[3px]" style={{ background: EXPENSE }} /> Expenses
        </span>
      </div>
      <div ref={box} className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto w-full" role="group" aria-label="Income and expenses by month. Focus a month for its totals, or use the table below.">
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={pad.left} x2={W - pad.right} y1={y(tk)} y2={y(tk)} stroke="#f0d3dc" strokeWidth={1} />
              <text x={pad.left - 8} y={y(tk)} dy="0.32em" textAnchor="end" fontSize={11} fill="#6b3445">
                {compact(tk)}
              </text>
            </g>
          ))}
          {months.map((m, i) => {
            const x0 = pad.left + band * i + (band - (barW * 2 + 2)) / 2;
            const dim = hover !== null && hover !== i;
            return (
              <g key={m.key}>
                {bar(x0, m.incomeCents, INCOME, dim)}
                {bar(x0 + barW + 2, m.expenseCents, EXPENSE, dim)}
                <text x={pad.left + band * i + band / 2} y={H - 8} textAnchor="middle" fontSize={11} fill={hover === i ? "#3a0f1c" : "#6b3445"} fontWeight={hover === i ? 600 : 400}>
                  {m.label}
                </text>
                {/* Hit target: the whole month band, bigger than the bars. */}
                <rect
                  x={pad.left + band * i}
                  y={pad.top}
                  width={band}
                  height={plotH + 18}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${m.long}: income ${usd(m.incomeCents)}, expenses ${usd(m.expenseCents)}, net ${usd(m.incomeCents - m.expenseCents)}`}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  style={{ outline: "none", cursor: "default" }}
                />
              </g>
            );
          })}
          <line x1={pad.left} x2={W - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke="#d9a7b8" strokeWidth={1} />
        </svg>
        {h && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-xl border border-line bg-panel px-3 py-2.5 text-xs shadow-lg"
            style={{ left: `clamp(5.5rem, ${tipLeft}%, calc(100% - 5.5rem))` }}
          >
            <p className="mb-1.5 font-medium text-ink-soft">{h.long}</p>
            {[
              ["Income", h.incomeCents, INCOME],
              ["Expenses", h.expenseCents, EXPENSE],
            ].map(([label, v, c]) => (
              <p key={label as string} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-0.5 w-3 rounded" style={{ background: c as string }} />
                <strong className="text-sm tabular-nums text-ink">{usd(v as number)}</strong>
                <span className="text-ink-soft">{label as string}</span>
              </p>
            ))}
            <p className="mt-1.5 border-t border-line pt-1.5">
              <strong className="text-sm tabular-nums text-ink">{usd(h.incomeCents - h.expenseCents)}</strong> <span className="text-ink-soft">net</span>
            </p>
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-ink-soft hover:text-ink">Show as table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-xs text-ink-soft">
            <tr>
              <th className="py-1 font-medium">Month</th>
              <th className="py-1 text-right font-medium">Income</th>
              <th className="py-1 text-right font-medium">Expenses</th>
              <th className="py-1 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {months.map((m) => (
              <tr key={m.key}>
                <td className="py-1.5">{m.long}</td>
                <td className="py-1.5 text-right">{usd(m.incomeCents)}</td>
                <td className="py-1.5 text-right">{usd(m.expenseCents)}</td>
                <td className="py-1.5 text-right font-medium">{usd(m.incomeCents - m.expenseCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Thin horizontal share bars for a breakdown (single series, so no legend). */
export function ShareBars({ rows, total, color = INCOME }: { rows: { label: string; cents: number }[]; total: number; color?: string }) {
  if (!rows.length) return <p className="py-4 text-center text-sm text-ink-soft">Nothing in this period yet.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink-soft">{r.label}</span>
            <span className="shrink-0 tabular-nums">
              <strong className="font-semibold text-ink">{usd(r.cents)}</strong>
              <span className="ml-1.5 text-xs text-ink-soft">{total ? Math.round((r.cents / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-plaster-2">
            <div className="h-full rounded-full" style={{ width: `${total ? Math.max(2, (r.cents / total) * 100) : 0}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
