import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { loadCatalog } from "@/lib/catalog";
import { Flash, PageHeader } from "@/components/admin/ui";
import NewAppointmentForm from "@/components/admin/NewAppointmentForm";

export const dynamic = "force-dynamic";

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await getDb();
  const [catalog, clients] = await Promise.all([
    loadCatalog(db),
    db.select({ id: t.clients.id, firstName: t.clients.firstName, lastName: t.clients.lastName, email: t.clients.email, phone: t.clients.phone, smsOptIn: t.clients.smsOptIn }).from(t.clients).orderBy(asc(t.clients.firstName)),
  ]);
  return (
    <>
      <Link href="/admin" className="text-sm text-stone-600 hover:text-plum">
        ‹ Appointments
      </Link>
      <PageHeader title="New appointment" />
      <Flash sp={sp} />
      <NewAppointmentForm
        services={catalog.services.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name, category: s.categoryName, durationMin: s.durationMin, priceCents: s.priceCents, depositCents: s.depositCents, addonIds: s.addonIds, locationIds: s.locationIds }))}
        addons={catalog.addons.filter((a) => a.active).map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents, durationMin: a.durationMin }))}
        locations={catalog.locations.filter((l) => l.active).map((l) => ({ id: l.id, name: l.name }))}
        clients={clients}
        defaultServiceId={sp.service ? Number(sp.service) : undefined}
        defaultClientId={sp.client ? Number(sp.client) : undefined}
      />
    </>
  );
}
