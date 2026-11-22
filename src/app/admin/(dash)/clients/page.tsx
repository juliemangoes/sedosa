import Link from "next/link";
import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { prettyPhone } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";
import { DateTime } from "luxon";
import { AIPhone, AIUsers, WhatsAppIcon } from "@/components/admin/icons";
import { Avatar, Card, Empty, PageHeader, btnSecondaryCls, inputCls } from "@/components/admin/ui";

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
      last: sql<Date | null>`max(${t.appointments.startsAt}) filter (where ${t.appointments.status} in ('confirmed','completed','no_show'))`,
    })
    .from(t.clients)
    .leftJoin(t.appointments, eq(t.appointments.clientId, t.clients.id))
    .where(q ? or(ilike(t.clients.firstName, like), ilike(t.clients.lastName, like), ilike(t.clients.email, like), ilike(t.clients.phone, like), ilike(sql`${t.clients.firstName} || ' ' || ${t.clients.lastName}`, like)) : undefined)
    .groupBy(t.clients.id)
    .orderBy(desc(sql`max(${t.appointments.startsAt})`), asc(t.clients.firstName))
    .limit(300);
  const now = new Date();
  const fmt = (d: Date | null) => {
    if (!d) return null;
    const x = DateTime.fromJSDate(new Date(d)).setZone(settings.timezone);
    return `${new Date(d) > now ? "Next" : "Last"} ${x.toFormat(x.year === DateTime.now().year ? "LLL d" : "LLL d, yyyy")}`;
  };

  return (
    <>
      <PageHeader title="Clients" subtitle={q ? `${rows.length} match${rows.length === 1 ? "" : "es"} for “${q}”` : `${rows.length} client${rows.length === 1 ? "" : "s"}`} />
      <form className="mb-4 flex max-w-lg gap-2" action="/admin/clients" role="search">
        <input name="q" type="search" defaultValue={q} placeholder="Search name, email or phone" className={inputCls} aria-label="Search clients" />
        <button className={btnSecondaryCls} type="submit">
          Search
        </button>
      </form>
      <Card className="p-0!">
        {rows.length === 0 ? (
          <div className="p-5">
            <Empty icon={<AIUsers size={22} />}>{q ? "No clients match that search." : "Clients appear here after their first booking."}</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {rows.map(({ c, visits, noShows, last }) => {
              const wa = waLink(c.phone);
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-stone-50/70 sm:px-5">
                  <Link href={`/admin/clients/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar first={c.firstName} last={c.lastName} />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2 font-medium text-stone-900">
                        {c.firstName} {c.lastName}
                        {noShows > 0 && <span className="rounded-full bg-rose-50 px-2 text-xs font-normal text-rose-800">{noShows} no-show</span>}
                        {c.whatsappOptIn && <span className="rounded-full bg-emerald-50 px-2 text-xs font-normal text-[#075e54]">WhatsApp</span>}
                      </span>
                      <span className="block truncate text-sm text-stone-500">
                        {prettyPhone(c.phone) || c.email}
                        <span className="hidden md:inline"> · {c.email}</span>
                      </span>
                    </span>
                  </Link>
                  <span className="hidden w-24 text-right text-sm sm:block">
                    <span className="block font-medium tabular-nums">{visits}</span>
                    <span className="text-xs text-stone-500">visit{visits === 1 ? "" : "s"}</span>
                  </span>
                  <span className="hidden w-28 text-right text-sm text-stone-600 lg:block">{fmt(last) ?? "—"}</span>
                  <span className="flex items-center gap-1">
                    {c.phone && (
                      <a href={`tel:${c.phone}`} aria-label={`Call ${c.firstName}`} className="grid size-9 place-items-center rounded-full text-stone-600 hover:bg-stone-100 hover:text-plum">
                        <AIPhone size={17} />
                      </a>
                    )}
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.firstName}`} className="grid size-9 place-items-center rounded-full text-[#075e54] hover:bg-emerald-50">
                        <WhatsAppIcon size={18} />
                      </a>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
