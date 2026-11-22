import Link from "next/link";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, METHODS, ledger, monthlySeries, outstanding, recurringTemplates, resolvePeriod, summarize } from "@/lib/finance";
import { logRecurringAction } from "../../actions";
import FinanceChart, { ShareBars } from "@/components/admin/FinanceChart";
import TransactionDialog from "@/components/admin/TransactionDialog";
import SubmitButton from "@/components/admin/SubmitButton";
import { AIArrowDown, AIArrowUp, AIDownload, AIPlus, AIWallet } from "@/components/admin/icons";
import { Card, Empty, Flash, PageHeader, Stat, btnCls, btnSecondaryCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const PERIODS = [
  ["this-month", "This month"],
  ["last-month", "Last month"],
  ["this-year", "This year"],
  ["last-12", "Last 12 months"],
] as const;

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const settings = await getSettings(db);
  const zone = settings.timezone;
  const period = resolvePeriod(zone, sp.period, sp.from, sp.to);
  const type = sp.type === "income" || sp.type === "expense" ? sp.type : "all";
  const today = DateTime.now().setZone(zone);
  const [entries, series, owed, recurring] = await Promise.all([
    ledger(db, zone, period.from, period.to),
    monthlySeries(db, zone, 6),
    outstanding(db),
    recurringTemplates(db, today.toFormat("yyyy-LL")),
  ]);
  const s = summarize(entries);
  const shown = type === "all" ? entries : entries.filter((e) => e.kind === type);
  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ period: period.key, from: sp.from, to: sp.to, type: type === "all" ? undefined : type, ...over })) if (v) p.set(k, v);
    return `/admin/finance?${p}`;
  };
  const back = qs({});
  const dialogCommon = { expenseCategories: EXPENSE_CATEGORIES, incomeCategories: INCOME_CATEGORIES, methods: METHODS, back };
  const todayIso = today.toISODate()!;

  return (
    <>
      <PageHeader title="Finance" subtitle={`Income and expenses · ${period.label}`}>
        <TransactionDialog {...dialogCommon} draft={{ kind: "expense", date: todayIso }} triggerClassName={btnCls} trigger={<><AIPlus size={17} /> Add expense</>} />
        <TransactionDialog {...dialogCommon} draft={{ kind: "income", date: todayIso }} triggerClassName={btnSecondaryCls} trigger={<><AIPlus size={17} /> Add income</>} />
        <a href={`/api/admin/finance/export?${new URLSearchParams({ period: period.key, ...(sp.from ? { from: sp.from } : {}), ...(sp.to ? { to: sp.to } : {}) })}`} className={btnSecondaryCls}>
          <AIDownload size={17} /> Export CSV
        </a>
      </PageHeader>
      <Flash sp={sp} />

      <div className="-mx-4 mb-5 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Period">
        {PERIODS.map(([k, label]) => (
          <Link key={k} href={qs({ period: k, from: undefined, to: undefined })} aria-current={period.key === k ? "page" : undefined} className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${period.key === k ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-stone-400"}`}>
            {label}
          </Link>
        ))}
        <form action="/admin/finance" className="flex shrink-0 items-center gap-1.5 text-sm">
          <input type="hidden" name="period" value="custom" />
          <input type="date" name="from" defaultValue={period.key === "custom" ? period.from : ""} aria-label="From" className="rounded-full border border-stone-200 bg-white px-3 py-1.5" />
          <span className="text-stone-500" aria-hidden="true">–</span>
          <input type="date" name="to" defaultValue={period.key === "custom" ? period.to : ""} aria-label="To" className="rounded-full border border-stone-200 bg-white px-3 py-1.5" />
          <button type="submit" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-stone-200 hover:ring-stone-400">
            Go
          </button>
        </form>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Income" value={money(s.incomeCents)} icon={<AIArrowUp size={14} />} hint={`${s.visits} paid visit${s.visits === 1 ? "" : "s"}`} />
        <Stat label="Expenses" value={money(s.expenseCents)} icon={<AIArrowDown size={14} />} hint={plural(entries.filter((e) => e.kind === "expense").length, "entry", "entries")} />
        <Stat label="Net profit" value={money(s.netCents)} tone="brand" icon={<AIWallet size={14} />} hint={s.incomeCents ? `${Math.round((s.netCents / s.incomeCents) * 100)}% margin` : "No income yet"} />
        <Stat label="Owed to you" value={money(owed.balancesCents + owed.depositsCents)} hint={`${money(owed.depositsCents)} deposits · ${money(owed.balancesCents)} balances`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Income vs expenses" subtitle="Last 6 months">
          <FinanceChart months={series} />
        </Card>
        <div className="space-y-6">
          <Card title="Income by payment method" subtitle={period.label}>
            <ShareBars rows={s.incomeByMethod} total={s.incomeCents} />
          </Card>
          <Card title="Where the money goes" subtitle={`Expenses · ${period.label}`}>
            <ShareBars rows={s.expenseByCategory} total={s.expenseCents} color="#eb6834" />
          </Card>
        </div>
      </div>

      {recurring.length > 0 && (
        <Card title="Monthly expenses" subtitle={`Log ${today.toFormat("LLLL")}'s with one tap`} className="mt-6">
          <ul className="divide-y divide-stone-100">
            {recurring.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{r.description || r.category}</span>
                  <span className="ml-2 text-stone-500">{r.category}</span>
                </span>
                <span className="font-semibold tabular-nums">{money(r.amountCents)}</span>
                {r.loggedThisMonth ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">Logged ✓</span>
                ) : (
                  <form action={logRecurringAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="back" value={back} />
                    <SubmitButton className={btnSecondaryCls} pendingText="Logging…">
                      Log for {today.toFormat("LLL")}
                    </SubmitButton>
                  </form>
                )}
                <TransactionDialog {...dialogCommon} draft={{ ...r, kind: "expense" }} triggerClassName="text-xs text-stone-500 underline-offset-4 hover:underline" trigger="Edit" triggerLabel={`Edit recurring ${r.description || r.category}`} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        className="mt-6"
        title="Transactions"
        subtitle={`${shown.length} in ${period.label}`}
        actions={
          <div className="flex rounded-full bg-stone-100 p-0.5 text-sm" role="group" aria-label="Show">
            {(["all", "income", "expense"] as const).map((k) => (
              <Link key={k} href={qs({ type: k === "all" ? undefined : k })} aria-current={type === k ? "page" : undefined} className={`rounded-full px-3 py-1 ${type === k ? "bg-white font-medium shadow-sm" : "text-stone-600"}`}>
                {k === "expense" ? "Expenses" : k === "income" ? "Income" : "All"}
              </Link>
            ))}
          </div>
        }
      >
        {shown.length === 0 ? (
          <Empty icon={<AIWallet size={20} />}>
            Nothing here yet. Payments you record on appointments show up automatically; add expenses as you go.
          </Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-stone-500">
                <tr className="border-b border-stone-100">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium">Method</th>
                  <th className="px-5 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {shown.slice(0, 300).map((e) => (
                  <tr key={e.key} className="hover:bg-stone-50">
                    <td className="whitespace-nowrap px-5 py-2.5 text-stone-500">{DateTime.fromISO(e.date).toFormat("LLL d")}</td>
                    <td className="py-2.5">
                      {e.appointmentId ? (
                        <Link href={`/admin/appointments/${e.appointmentId}`} className="hover:text-plum hover:underline">
                          {e.description}
                        </Link>
                      ) : (
                        <TransactionDialog
                          {...dialogCommon}
                          draft={{ id: e.txId, kind: e.kind, date: e.date, amountCents: e.amountCents, category: e.category, method: e.method, description: e.description, receiptMediaId: e.receiptMediaId }}
                          triggerClassName="text-left hover:text-plum hover:underline"
                          trigger={
                            <>
                              {e.description || e.category}
                              {e.recurring && <span className="ml-1.5 text-xs text-stone-500">monthly</span>}
                              {e.receiptMediaId && <span className="ml-1.5 text-xs text-stone-500">receipt</span>}
                            </>
                          }
                          triggerLabel={`Edit ${e.description || e.category}`}
                        />
                      )}
                    </td>
                    <td className="py-2.5 text-stone-600">{e.category}</td>
                    <td className="py-2.5 text-stone-600">{METHODS[e.method] ?? e.method}</td>
                    <td className={`whitespace-nowrap px-5 py-2.5 text-right font-semibold tabular-nums ${e.kind === "income" ? "text-emerald-700" : "text-stone-900"}`}>
                      {e.kind === "income" ? "+" : "−"}
                      {money(e.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
