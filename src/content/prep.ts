// Appointment prep, taken from the studio's booking-page graphics ("Prepare for
// brow / wax appointment") and the lash lift consent form. Edit freely.

export type PrepGuide = { id: "brows" | "lashes" | "waxing"; title: string; items: string[] };

export const PREP_GUIDES: PrepGuide[] = [
  {
    id: "brows",
    title: "Brows",
    items: [
      "Come with a clean face, no makeup",
      "Avoid exfoliants & retinols 3 days before",
      "Avoid any sort of hair removal on your brows",
      "Wear comfortable clothing",
      "Be camera ready :)",
    ],
  },
  {
    id: "lashes",
    title: "Lash lifts",
    items: [
      "Arrive without eye makeup, mascara or oils around the lashes & brows",
      "Skip retinol, Retin-A & strong exfoliants around the eyes for 7 days",
      "Reschedule if you have pink eye, a stye or any eye irritation",
      "Let me know if you're pregnant or breastfeeding",
      "Wear comfortable clothing",
    ],
  },
  {
    id: "waxing",
    title: "Waxing",
    items: [
      "Come with cleansed skin",
      "Gently exfoliate 24–48 hours before",
      "Hair should be about the size of a grain of rice (¼ in), the longer the better",
      "Avoid any sort of hair removal for 2 weeks before",
      "Wear comfortable, loose clothing",
    ],
  },
];

/** Applies to every appointment. */
export const PREP_ALWAYS = ["Arrive on time!", "1 extra guest allowed, no children", "Cancel if you're feeling unwell"];

/** Which guides apply to a service, judged from its category and name. */
export function guidesFor(categoryName: string, serviceName: string): PrepGuide[] {
  const s = `${categoryName} ${serviceName}`.toLowerCase();
  const ids = new Set<PrepGuide["id"]>();
  if (/brow|pmu|ombr/.test(s)) ids.add("brows");
  if (/lash lift|kll|korean/.test(s)) ids.add("lashes");
  if (/wax/.test(s) && !/brow sculpt\/wax/.test(s)) ids.add("waxing");
  if (/brow sculpt\/wax/.test(s)) ids.add("brows");
  return PREP_GUIDES.filter((g) => ids.has(g.id));
}
