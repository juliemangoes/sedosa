import type { Metadata } from "next";
import { cache } from "react";
import { and, desc, gte, inArray, sql } from "drizzle-orm";
import type { Settings } from "@/lib/settings";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { loadCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { appUrl, stripeEnabled } from "@/lib/env";
import { cityFromAddress, hoursRows, openingHoursSpec, placesLabel } from "@/lib/display";
import BookingApp from "@/components/booking/BookingApp";
import { mediaUrl } from "@/lib/media";
import { accountsEnabled, currentClient } from "@/lib/client-session";
import { profileOf, savedAnswers } from "@/lib/account";
import Hero, { type Openings } from "@/components/landing/Hero";
import { DateTime } from "luxon";
import { getAvailability } from "@/lib/booking";
import InfoSections, { SiteFooter } from "@/components/landing/InfoSections";
import type { PublicData } from "@/components/booking/types";

export const dynamic = "force-dynamic";

// Shared by generateMetadata and the page within one request.
const load = cache(async () => {
  const db = await getDb();
  const [catalog, settings] = await Promise.all([loadCatalog(db, { publicOnly: true }), getSettings(db)]);
  return { catalog, settings };
});

/** Up to three services with real recent demand: at least 3 bookings in the last 120 days. */
async function popularServiceIds(): Promise<number[]> {
  const db = await getDb();
  const since = new Date(Date.now() - 120 * 86_400_000);
  const rows = await db
    .select({ serviceId: t.appointments.serviceId, n: sql<number>`count(*)::int` })
    .from(t.appointments)
    .where(and(gte(t.appointments.createdAt, since), inArray(t.appointments.status, ["confirmed", "completed"])))
    .groupBy(t.appointments.serviceId)
    .orderBy(desc(sql`count(*)`))
    .limit(3);
  return rows.filter((r) => r.n >= 3).map((r) => r.serviceId);
}

/** The next three open times for one featured service (the most booked, else the first on the menu). */
async function nextOpenings(catalog: Awaited<ReturnType<typeof loadCatalog>>, zone: string, popular: number[]): Promise<Openings | null> {
  const svc = catalog.services.find((s) => s.id === popular[0]) ?? catalog.services.find((s) => s.priceCents > 0) ?? catalog.services[0];
  if (!svc) return null;
  try {
    const db = await getDb();
    const res = await getAvailability(db, { serviceId: svc.id, locationId: "any", addonIds: [], days: 7 });
    const slots = res.dates.flatMap((d) => d.slots).slice(0, 3);
    return {
      serviceId: svc.id,
      serviceName: svc.name,
      durationMin: res.durationMin,
      slots: slots.map((sl) => {
        const t = DateTime.fromISO(sl.start).setZone(zone);
        return { start: sl.start, locationIds: sl.locationIds, day: t.toFormat("ccc d LLL"), time: t.toFormat("h:mm"), meridiem: t.toFormat("a") };
      }),
    };
  } catch {
    return null;
  }
}

/** The owner's photo-wall photos, in order, with their real dimensions. */
async function galleryPhotos(settings: Settings, businessName: string): Promise<PublicData["gallery"]> {
  const ids = settings.galleryPhotos.map((p) => p.mediaId);
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db.select({ id: t.media.id, width: t.media.width, height: t.media.height }).from(t.media).where(inArray(t.media.id, ids));
  const dims = new Map(rows.map((r) => [r.id, r]));
  return settings.galleryPhotos
    .filter((p) => dims.has(p.mediaId))
    .map((p) => ({ url: mediaUrl(p.mediaId)!, alt: p.alt || `A photo from ${businessName}`, width: dims.get(p.mediaId)!.width, height: dims.get(p.mediaId)!.height }));
}

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
  const db = await getDb();
  const [{ catalog, settings }, sp, popularIds, me] = await Promise.all([load(), searchParams, popularServiceIds(), currentClient(db)]);
  const [answers, openings, gallery] = await Promise.all([
    me ? savedAnswers(db, me.id) : Promise.resolve({}),
    nextOpenings(catalog, settings.timezone, popularIds),
    galleryPhotos(settings, settings.businessName),
  ]);

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
    whatsappReminders: settings.whatsappReminders,
    whatsappNumber: settings.whatsappNumber,
    manualDepositInstructions: settings.manualDepositInstructions,
    depositCents,
    hoursHeadline: openRow ? `${openRow.days} · ${openRow.hours}` : "By appointment",
    hours,
    categories: catalog.categories.map((c) => ({ id: c.id, name: c.name, description: c.description, imageUrl: mediaUrl(c.imageId) })),
    popularIds: popularIds.filter((id) => catalog.services.some((s) => s.id === id)),
    gallery,
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
        initialSlot={sp.slot ? { start: sp.slot, locationIds: (sp.loc ?? "").split(",").map(Number).filter(Boolean) } : undefined}
        hero={<Hero data={data} openings={openings} />}
        sections={<InfoSections data={data} />}
        footer={<SiteFooter data={data} />}
        initialAccount={me ? profileOf(me) : null}
        initialSavedAnswers={answers}
        accountsEnabled={accountsEnabled()}
      />
    </>
  );
}
