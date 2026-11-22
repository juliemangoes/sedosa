import { DateTime } from "luxon";
import { and, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import type { DB } from "@/db";
import * as t from "@/db/schema";
import type { TxKind } from "@/db/schema";
import { prettyName } from "./display";

/**
 * Studio finances: income is every appointment payment (deposits, balances,
 * tips, fees) plus manual entries; expenses are entered by the owner.
 */

export const EXPENSE_CATEGORIES = [
  "Supplies & products",
  "Rent & studio",
  "Equipment",
  "Marketing",
  "Education & training",
  "Software & apps",
  "Utilities & phone",
  "Card & bank fees",
  "Travel",
  "Other",
] as const;
export const INCOME_CATEGORIES = ["Product sales", "Gift cards", "Tips", "Other income"] as const;
export const METHODS: Record<string, string> = {
  cash: "Cash",
  cashapp: "Cash App",
  zelle: "Zelle",
  card: "Card",
  stripe: "Card (online)",
  bank: "Bank transfer",
  other: "Other",
};

export type LedgerEntry = {
  key: string;
  source: "appointment" | "manual";
  kind: TxKind;
  date: string;
  amountCents: number;
  category: string;
  method: string;
  description: string;
  appointmentId?: string;
  txId?: number;
  recurring?: boolean;
  receiptMediaId?: number | null;
};

export type Period = { key: string; label: string; from: string; to: string };

/** Named periods (in the studio's time zone) plus a custom range. */
export function resolvePeriod(zone: string, key = "this-month", from?: string, to?: string, now = new Date()): Period {
  const today = DateTime.fromJSDate(now).setZone(zone).startOf("day");
  const iso = (d: DateTime) => d.toISODate()!;
  switch (key) {
    case "last-month": {
      const m = today.minus({ months: 1 });
      return { key, label: m.toFormat("LLLL yyyy"), from: iso(m.startOf("month")), to: iso(m.endOf("month")) };
    }
    case "this-year":
      return { key, label: today.toFormat("yyyy"), from: iso(today.startOf("year")), to: iso(today.endOf("year")) };
    case "last-12":
      return { key, label: "Last 12 months", from: iso(today.minus({ months: 11 }).startOf("month")), to: iso(today.endOf("month")) };
    case "custom": {
      const f = from && DateTime.fromISO(from).isValid ? from : iso(today.startOf("month"));
      const tt = to && DateTime.fromISO(to).isValid && to >= f ? to : iso(today);
      return { key, label: `${DateTime.fromISO(f).toFormat("LLL d")} – ${DateTime.fromISO(tt).toFormat("LLL d, yyyy")}`, from: f, to: tt };
    }
    default:
      return { key: "this-month", label: today.toFormat("LLLL yyyy"), from: iso(today.startOf("month")), to: iso(today.endOf("month")) };
  }
}

function bounds(zone: string, from: string, to: string) {
  return {
    start: DateTime.fromISO(from, { zone }).startOf("day").toJSDate(),
    end: DateTime.fromISO(to, { zone }).plus({ days: 1 }).startOf("day").toJSDate(),
  };
}

const PAYMENT_CATEGORY: Record<string, string> = {
  deposit: "Services",
  balance: "Services",
  tip: "Tips",
  no_show_fee: "Fees",
  late_fee: "Fees",
  other: "Other income",
};

export async function ledger(db: DB, zone: string, from: string, to: string): Promise<LedgerEntry[]> {
  const { start, end } = bounds(zone, from, to);
  const [pays, txs] = await Promise.all([
    db
      .select({ p: t.payments, a: t.appointments, c: t.clients })
      .from(t.payments)
      .innerJoin(t.appointments, eq(t.appointments.id, t.payments.appointmentId))
      .innerJoin(t.clients, eq(t.clients.id, t.appointments.clientId))
      .where(and(gte(t.payments.createdAt, start), lt(t.payments.createdAt, end))),
    db.select().from(t.transactions).where(and(gte(t.transactions.date, from), lte(t.transactions.date, to), eq(t.transactions.recurringMonthly, false))),
  ]);
  const out: LedgerEntry[] = [
    ...pays.map(({ p, a, c }) => ({
      key: `p${p.id}`,
      source: "appointment" as const,
      kind: "income" as const,
      date: DateTime.fromJSDate(p.createdAt).setZone(zone).toISODate()!,
      amountCents: p.amountCents,
      category: PAYMENT_CATEGORY[p.kind] ?? "Services",
      method: p.method,
      description: `${prettyName(a.snapshot.serviceName)} · ${c.firstName} ${c.lastName}`.trim(),
      appointmentId: a.id,
    })),
    ...txs.map((x) => ({
      key: `t${x.id}`,
      source: "manual" as const,
      kind: x.kind,
      date: x.date,
      amountCents: x.amountCents,
      category: x.category,
      method: x.method,
      description: x.description,
      txId: x.id,
      recurring: !!x.recurringSourceId,
      receiptMediaId: x.receiptMediaId,
    })),
  ];
  return out.sort((a, b) => (a.date === b.date ? b.key.localeCompare(a.key) : b.date.localeCompare(a.date)));
}

export function summarize(entries: LedgerEntry[]) {
  const sum = (xs: LedgerEntry[]) => xs.reduce((n, e) => n + e.amountCents, 0);
  const income = entries.filter((e) => e.kind === "income");
  const expenses = entries.filter((e) => e.kind === "expense");
  const group = (xs: LedgerEntry[], by: (e: LedgerEntry) => string) => {
    const m = new Map<string, number>();
    for (const e of xs) m.set(by(e), (m.get(by(e)) ?? 0) + e.amountCents);
    return [...m.entries()].map(([label, cents]) => ({ label, cents })).sort((a, b) => b.cents - a.cents);
  };
  const visits = new Set(income.filter((e) => e.appointmentId && e.category === "Services").map((e) => e.appointmentId)).size;
  const serviceIncome = sum(income.filter((e) => e.category === "Services"));
  return {
    incomeCents: sum(income),
    expenseCents: sum(expenses),
    netCents: sum(income) - sum(expenses),
    avgPerVisitCents: visits ? Math.round(serviceIncome / visits) : 0,
    visits,
    incomeByMethod: group(income, (e) => METHODS[e.method] ?? e.method),
    incomeByCategory: group(income, (e) => e.category),
    expenseByCategory: group(expenses, (e) => e.category),
  };
}

/** Income and expenses per month for the last `months` months (oldest first). */
export async function monthlySeries(db: DB, zone: string, months = 6, now = new Date()) {
  const last = DateTime.fromJSDate(now).setZone(zone).startOf("month");
  const first = last.minus({ months: months - 1 });
  const entries = await ledger(db, zone, first.toISODate()!, last.endOf("month").toISODate()!);
  return Array.from({ length: months }, (_, i) => {
    const m = first.plus({ months: i });
    const key = m.toFormat("yyyy-LL");
    const inMonth = entries.filter((e) => e.date.startsWith(key));
    return {
      key,
      label: m.toFormat("LLL"),
      long: m.toFormat("LLLL yyyy"),
      incomeCents: inMonth.filter((e) => e.kind === "income").reduce((n, e) => n + e.amountCents, 0),
      expenseCents: inMonth.filter((e) => e.kind === "expense").reduce((n, e) => n + e.amountCents, 0),
    };
  });
}

/** Money clients still owe: unpaid balances on completed visits + deposits due on upcoming ones. */
export async function outstanding(db: DB, now = new Date()) {
  const rows = await db
    .select({ price: t.appointments.priceCents, paid: t.appointments.amountPaidCents, status: t.appointments.status, deposit: t.appointments.depositCents, depositStatus: t.appointments.depositStatus, startsAt: t.appointments.startsAt })
    .from(t.appointments)
    .where(inArray(t.appointments.status, ["completed", "confirmed"]));
  let balances = 0;
  let deposits = 0;
  for (const r of rows) {
    if (r.status === "completed" && r.paid < r.price) balances += r.price - r.paid;
    if (r.status === "confirmed" && r.startsAt > now && r.depositStatus === "due") deposits += r.deposit;
  }
  return { balancesCents: balances, depositsCents: deposits };
}

/** Monthly recurring expense templates and whether each was logged for the given month. */
export async function recurringTemplates(db: DB, monthKey: string) {
  const templates = await db.select().from(t.transactions).where(eq(t.transactions.recurringMonthly, true));
  if (!templates.length) return [];
  const logged = await db
    .select({ src: t.transactions.recurringSourceId })
    .from(t.transactions)
    .where(and(inArray(t.transactions.recurringSourceId, templates.map((x) => x.id)), sql`${t.transactions.date} like ${monthKey + "%"}`));
  const done = new Set(logged.map((l) => l.src));
  return templates.map((x) => ({ ...x, loggedThisMonth: done.has(x.id) }));
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(entries: LedgerEntry[]) {
  const head = ["Date", "Type", "Category", "Description", "Method", "Amount", "Source"];
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [e.date, e.kind === "income" ? "Income" : "Expense", e.category, e.description, METHODS[e.method] ?? e.method, ((e.kind === "expense" ? -1 : 1) * e.amountCents / 100).toFixed(2), e.source === "appointment" ? "Appointment" : "Manual"]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
