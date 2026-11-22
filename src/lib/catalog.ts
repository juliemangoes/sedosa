import { asc } from "drizzle-orm";
import type { DB } from "@/db";
import * as t from "@/db/schema";
import type { FormWithFields } from "./intake";

export type ServiceDetail = {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  depositCents: number;
  paddingBeforeMin: number;
  paddingAfterMin: number;
  active: boolean;
  private: boolean;
  sortOrder: number;
  locationIds: number[];
  addonIds: number[];
  formIds: number[];
};

export type Catalog = {
  categories: { id: number; name: string; description: string; imageId: number | null; sortOrder: number; services: ServiceDetail[] }[];
  services: ServiceDetail[];
  addons: (typeof t.addons.$inferSelect)[];
  forms: FormWithFields[];
  locations: (typeof t.locations.$inferSelect)[];
};

/** Loads the whole menu. Small enough for a studio to load in one go. */
export async function loadCatalog(db: DB, opts: { publicOnly?: boolean } = {}): Promise<Catalog> {
  const [cats, svcs, adds, frms, fields, locs, sl, sa, sf] = await Promise.all([
    db.select().from(t.categories).orderBy(asc(t.categories.sortOrder), asc(t.categories.id)),
    db.select().from(t.services).orderBy(asc(t.services.sortOrder), asc(t.services.id)),
    db.select().from(t.addons).orderBy(asc(t.addons.sortOrder), asc(t.addons.id)),
    db.select().from(t.forms).orderBy(asc(t.forms.sortOrder), asc(t.forms.id)),
    db.select().from(t.formFields).orderBy(asc(t.formFields.sortOrder), asc(t.formFields.id)),
    db.select().from(t.locations).orderBy(asc(t.locations.sortOrder), asc(t.locations.id)),
    db.select().from(t.serviceLocations),
    db.select().from(t.serviceAddons),
    db.select().from(t.serviceForms),
  ]);

  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const activeLocs = new Set(locs.filter((l) => l.active).map((l) => l.id));
  const activeAddons = new Set(adds.filter((a) => a.active).map((a) => a.id));
  const locOrder = locs.map((l) => l.id);
  const addonOrder = adds.map((a) => a.id);
  const formOrder = frms.map((f) => f.id);

  let services: ServiceDetail[] = svcs.map((s) => ({
    ...s,
    categoryName: catName.get(s.categoryId) ?? "",
    locationIds: sl
      .filter((x) => x.serviceId === s.id && (!opts.publicOnly || activeLocs.has(x.locationId)))
      .map((x) => x.locationId)
      .sort((a, b) => locOrder.indexOf(a) - locOrder.indexOf(b)),
    addonIds: sa
      .filter((x) => x.serviceId === s.id && (!opts.publicOnly || activeAddons.has(x.addonId)))
      .map((x) => x.addonId)
      .sort((a, b) => addonOrder.indexOf(a) - addonOrder.indexOf(b)),
    formIds: sf
      .filter((x) => x.serviceId === s.id)
      .map((x) => x.formId)
      .sort((a, b) => formOrder.indexOf(a) - formOrder.indexOf(b)),
  }));
  if (opts.publicOnly) services = services.filter((s) => s.active && !s.private && s.locationIds.length > 0);

  const forms: FormWithFields[] = frms.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    fields: fields
      .filter((x) => x.formId === f.id)
      .map((x) => ({ id: x.id, type: x.type, label: x.label, options: x.options, required: x.required })),
  }));

  const categories = cats
    .map((c) => ({ ...c, services: services.filter((s) => s.categoryId === c.id) }))
    .filter((c) => !opts.publicOnly || c.services.length > 0);

  return {
    categories,
    services,
    addons: opts.publicOnly ? adds.filter((a) => a.active) : adds,
    forms,
    locations: opts.publicOnly ? locs.filter((l) => l.active) : locs,
  };
}
