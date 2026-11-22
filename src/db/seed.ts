import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import type { DB } from "./index";
import * as t from "./schema";
import {
  DEFAULT_HOURS,
  SEED_ADDONS,
  SEED_CATEGORIES,
  SEED_CATEGORY_DESCRIPTIONS,
  SEED_FORMS,
  SEED_LOCATIONS,
  SEED_SERVICES,
} from "./seed-data";
import { DEFAULT_SETTINGS } from "@/lib/settings";

/** Loads the studio's menu into an empty database. Does nothing if services already exist. */
export async function seedIfEmpty(db: DB): Promise<boolean> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(t.services);
  if (count > 0) return false;

  await db.transaction(async (tx) => {
    await tx
      .insert(t.settings)
      .values({ id: 1, data: { ...DEFAULT_SETTINGS, calendarFeedKey: randomBytes(18).toString("base64url") } })
      .onConflictDoNothing();

    const locs = await tx
      .insert(t.locations)
      .values(SEED_LOCATIONS.map((l, i) => ({ ...l, weeklyHours: DEFAULT_HOURS, sortOrder: i })))
      .returning();
    const locByName = new Map(locs.map((l) => [l.name, l.id]));

    const cats = await tx
      .insert(t.categories)
      .values(SEED_CATEGORIES.map((name, i) => ({ name, sortOrder: i, description: SEED_CATEGORY_DESCRIPTIONS[name] ?? "" })))
      .returning();
    const catByName = new Map(cats.map((c) => [c.name, c.id]));

    const adds = await tx
      .insert(t.addons)
      .values(SEED_ADDONS.map((a, i) => ({ ...a, sortOrder: i })))
      .returning();
    const addonByName = new Map(adds.map((a) => [a.name, a.id]));

    const formByName = new Map<string, number>();
    // Same order the old booking page showed them in (alphabetical).
    const formsInOrder = [...SEED_FORMS].sort((a, b) => a.name.localeCompare(b.name));
    for (const [i, f] of formsInOrder.entries()) {
      const [form] = await tx
        .insert(t.forms)
        .values({ name: f.name, description: f.description, sortOrder: i })
        .returning();
      formByName.set(f.name, form.id);
      await tx.insert(t.formFields).values(f.fields.map((fl, j) => ({ ...fl, formId: form.id, sortOrder: j })));
    }

    for (const [i, s] of SEED_SERVICES.entries()) {
      const [svc] = await tx
        .insert(t.services)
        .values({
          categoryId: catByName.get(s.category)!,
          name: s.name,
          description: s.description,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
          depositCents: s.depositCents,
          paddingBeforeMin: s.paddingBeforeMin,
          paddingAfterMin: s.paddingAfterMin,
          sortOrder: i,
        })
        .returning();
      const locIds = s.locations.map((n) => locByName.get(n)).filter((x): x is number => !!x);
      if (locIds.length) await tx.insert(t.serviceLocations).values(locIds.map((locationId) => ({ serviceId: svc.id, locationId })));
      const addIds = s.addons.map((n) => addonByName.get(n)).filter((x): x is number => !!x);
      if (addIds.length) await tx.insert(t.serviceAddons).values(addIds.map((addonId) => ({ serviceId: svc.id, addonId })));
      const formIds = s.forms.map((n) => formByName.get(n)).filter((x): x is number => !!x);
      if (formIds.length) await tx.insert(t.serviceForms).values(formIds.map((formId) => ({ serviceId: svc.id, formId })));
    }
  });
  return true;
}
