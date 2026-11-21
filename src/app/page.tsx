import { getDb } from "@/db";
import { loadCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { stripeEnabled } from "@/lib/env";
import BookingApp from "@/components/booking/BookingApp";
import type { PublicData } from "@/components/booking/types";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const db = await getDb();
  const [catalog, settings, sp] = await Promise.all([loadCatalog(db, { publicOnly: true }), getSettings(db), searchParams]);

  const data: PublicData = {
    businessName: settings.businessName,
    timezone: settings.timezone,
    bannerImages: settings.bannerImages,
    policies: settings.policies,
    locationNote: settings.locationNote,
    phone: settings.phone,
    email: settings.email,
    instagram: settings.instagram,
    onlineDeposit: stripeEnabled(),
    manualDepositInstructions: settings.manualDepositInstructions,
    categories: catalog.categories.map((c) => ({ id: c.id, name: c.name })),
    services: catalog.services.map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      priceCents: s.priceCents,
      depositCents: s.depositCents,
      locationIds: s.locationIds,
      addonIds: s.addonIds,
      formIds: s.formIds,
    })),
    addons: catalog.addons.map((a) => ({ id: a.id, name: a.name, durationMin: a.durationMin, priceCents: a.priceCents })),
    forms: catalog.forms,
    locations: catalog.locations.map((l) => ({ id: l.id, name: l.name, address: l.address })),
  };

  return <BookingApp data={data} initialServiceId={sp.service ? Number(sp.service) : undefined} />;
}
