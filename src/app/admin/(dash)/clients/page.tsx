import Link from "next/link";
import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { prettyPhone } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { DateTime } from "luxon";
import { Card, Empty, PageHeader, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const db = await getDb();
  const settings = await getSettings(db);
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const rows = await db
    .select({
      c: t.clients,
      visits: sql<number>`count(${t.appointments.id}) filter (where ${t.appointments.status} in ('confirmed','completed'))::int`,
      noShows: sql<number>`count(${t.appointments.id}) filter (where ${t.appointments.status} = 'no_show')::int`,
      last: sql<Date | null>`max(${t.appointments.startsAt})`,
    })
    .from(t.clients)
    .leftJoin(t.appointments, eq(t.appointments.clientId, t.clients.id))
    .where(q ? or(ilike(t.clients.firstName, like), ilike(t.clients.lastName, like), ilike(t.clients.email, like), ilike(t.clients.phone, like), ilike(sql`${t.clients.firstName} || ' ' || ${t.clients.lastName}`, like)) : undefined)
    .groupBy(t.clients.id)
    .orderBy(desc(sql`max(${t.appointments.startsAt})`), asc(t.clients.firstName))
    .limit(300);

  return (
    <>
      <PageHeader title="Clients" />
      <form className="mb-4 flex gap-2" action="/admin/clients">
        <input name="q" defaultValue={q} placeholder="Search name, email or phone" className={`${inputCls} max-w-sm`} aria-label="Search clients" />
        <button className={btnSecondaryCls} type="submit">
          Search
        </button>
      </form>
      <Card>
        {rows.length === 0 ? (
          <Empty>{q ? "No clients match that search." : "Clients appear here after their first booking."}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-stone-500">
                <tr>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="hidden pb-2 font-medium md:table-cell">Email</th>
                  <th className="pb-2 text-right font-medium">Visits</th>
                  <th className="hidden pb-2 text-right font-medium sm:table-cell">Last / next</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map(({ c, visits, noShows, last }) => (
                  <tr key={c.id}>
                    <td className="py-2.5">
                      <Link href={`/admin/clients/${c.id}`} className="font-medium hover:text-plum">
                        {c.firstName} {c.lastName}
                      </Link>
                      {noShows > 0 && <span className="ml-2 rounded-full bg-red-100 px-2 text-xs text-red-800">{noShows} no-show</span>}
                    </td>
                    <td className="py-2.5 whitespace-nowrap">{prettyPhone(c.phone)}</td>
                    <td className="hidden py-2.5 md:table-cell">{c.email}</td>
                    <td className="py-2.5 text-right tabular-nums">{visits}</td>
                    <td className="hidden py-2.5 text-right sm:table-cell">{last ? DateTime.fromJSDate(new Date(last)).setZone(settings.timezone).toFormat("LLL d, yyyy") : "—"}</td>
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
