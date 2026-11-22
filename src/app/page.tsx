import type { Metadata } from "next";
import { cache } from "react";
import { getDb } from "@/db";
import { loadCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { appUrl, stripeEnabled } from "@/lib/env";
import { cityFromAddress, hoursRows, openingHoursSpec, placesLabel } from "@/lib/display";
import BookingApp from "@/components/booking/BookingApp";
import Hero from "@/components/landing/Hero";
import InfoSections, { SiteFooter } from "@/components/landing/InfoSections";
import type { PublicData } from "@/components/booking/types";

export const dynamic = "force-dynamic";

// Shared by generateMetadata and the page within one request.
const load = cache(async () => {
  const db = await getDb();
  const [catalog, settings] = await Promise.all([loadCatalog(db, { publicOnly: true }), getSettings(db)]);
  return { catalog, settings };
});

export async function generateMetadata(): Promise<Metadata> {
  const { catalog, settings } = await load();
  const where = placesLabel(catalog.locations.map((l) => cityFromAddress(l.address)));
  const title = `${settings.businessName} · Brows, Lash Lifts & PMU${where ? ` in ${where}` : ""}`;
  const description = `Book brow lamination, Korean lash lifts, ombré powder brows and waxing${where ? ` in ${where}` : ""}. See prices and open times and book online in minutes.`;
  return {
    metadataBase: new URL(appUrl()),
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, type: "website", images: [{ url: "/banner/banner-1.jpg", width: 2000, height: 1000, alt: settings.businessName }] },
    twitter: { card: "summary_large_image", title, description, images: ["/banner/banner-1.jpg"] },
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ catalog, settings }, sp] = await Promise.all([load(), searchParams]);

  // Hours: one table when every studio keeps the same hours, otherwise one per studio.
  const hourGroups = catalog.locations.map((l) => ({ label: l.name, rows: hoursRows(l.weeklyHours) }));
  const allSame = hourGroups.every((g) => JSON.stringify(g.rows) === JSON.stringify(hourGroups[0]?.rows));
  const hours = allSame && hourGroups.length ? [{ label: "All studios", rows: hourGroups[0].rows }] : hourGroups;
  const openRow = hours[0]?.rows.find((r) => !r.closed);

  // The deposit most services ask for.
  const deposits = catalog.services.map((s) => s.depositCents).filter((c) => c > 0);
  const depositCents = deposits.length ? [...deposits].sort((a, b) => deposits.filter((x) => x === b).length - deposits.filter((x) => x === a).length)[0] : 0;

  const data: PublicData = {
    businessName: settings.businessName,
    timezone: settings.timezone,
    policies: settings.policies,
    locationNote: settings.locationNote,
    confirmationNote: settings.confirmationNote,
    phone: settings.phone,
    email: settings.email,
    instagram: settings.instagram,
    facebook: settings.facebook,
    cashAppHandle: settings.cashAppHandle,
    zelleHandle: settings.zelleHandle,
    onlineDeposit: stripeEnabled(),
    manualDepositInstructions: settings.manualDepositInstructions,
    depositCents,
    hoursHeadline: openRow ? `${openRow.days} · ${openRow.hours}` : "By appointment",
    hours,
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
    locations: catalog.locations.map((l) => ({ id: l.id, name: l.name, city: cityFromAddress(l.address) })),
  };

  const prices = catalog.services.map((s) => s.priceCents).filter((c) => c > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: settings.businessName,
    url: appUrl(),
    image: `${appUrl()}/banner/banner-1.jpg`,
    telephone: settings.phone || undefined,
    email: settings.email || undefined,
    priceRange: prices.length ? `$${Math.min(...prices) / 100}–$${Math.max(...prices) / 100}` : undefined,
    // Street addresses are shared after booking, so only the cities are published.
    areaServed: data.locations.map((l) => l.city).filter(Boolean),
    address: data.locations[0]?.city
      ? { "@type": "PostalAddress", addressLocality: data.locations[0].city.split(",")[0], addressRegion: data.locations[0].city.split(",")[1]?.trim(), addressCountry: "US" }
      : undefined,
    openingHours: catalog.locations[0] ? openingHoursSpec(catalog.locations[0].weeklyHours) : undefined,
    sameAs: [
      settings.instagram && `https://instagram.com/${settings.instagram.replace(/^@/, "")}`,
      settings.facebook && `https://facebook.com/${settings.facebook}`,
    ].filter(Boolean),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <BookingApp
        data={data}
        initialServiceId={sp.service ? Number(sp.service) : undefined}
        hero={<Hero data={data} />}
        sections={<InfoSections data={data} />}
        footer={<SiteFooter data={data} />}
      />
    </>
  );
}
