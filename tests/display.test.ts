import { describe, it, expect } from "vitest";
import { categoryLabel, cityFromAddress, hoursRows, placesLabel, prettyName, priceLabel, shortDuration } from "@/lib/display";
import { guidesFor } from "@/content/prep";
import { SEED_CATEGORIES, SEED_SERVICES, DEFAULT_HOURS } from "@/db/seed-data";

describe("display helpers", () => {
  it("cleans every real category name for chips", () => {
    expect(SEED_CATEGORIES.map(categoryLabel)).toEqual([
      "All Things Brows",
      "Korean Lash Lifts",
      "Lash Lift + Brow Packages",
      "Lash Removal",
      "PMU Services",
      "Waxing",
    ]);
    expect(categoryLabel("Ombré")).toBe("Ombré");
    expect(categoryLabel("Facials (New)")).toBe("Facials (New)");
  });

  it("prettifies service names without losing their voice", () => {
    expect(prettyName("Brow Lami Set<3")).toBe("Brow Lami Set ♡");
    expect(prettyName("OMBRE POWDER BROWS (CONSULTATION ONLY)")).toBe("Ombre Powder Brows (Consultation Only)");
    expect(prettyName("Underarm Wax!")).toBe("Underarm Wax!");
  });

  it("formats prices and durations compactly", () => {
    expect(priceLabel(9500)).toBe("$95");
    expect(priceLabel(850)).toBe("$8.50");
    expect(priceLabel(0)).toBe("Free");
    expect(shortDuration(65)).toBe("1 hr 5 min");
    expect(shortDuration(180)).toBe("3 hr");
    expect(shortDuration(15)).toBe("15 min");
  });

  it("derives cities without exposing street addresses", () => {
    expect(cityFromAddress("2843 Fairview rd, Covington GA 30016")).toBe("Covington, GA");
    expect(cityFromAddress("4336 Covington hwy, Suite 202, Decatur GA 30035")).toBe("Decatur, GA");
    expect(cityFromAddress("no address")).toBeNull();
    expect(placesLabel(["Covington, GA", "Decatur, GA"])).toBe("Covington & Decatur, GA");
    expect(placesLabel(["Covington, GA"])).toBe("Covington, GA");
  });

  it("groups weekly hours", () => {
    expect(hoursRows(DEFAULT_HOURS)).toEqual([
      { days: "Mon – Sat", hours: "9:30 AM – 8 PM", closed: false },
      { days: "Sun", hours: "Closed", closed: true },
    ]);
  });

  it("matches prep guides to every service", () => {
    for (const s of SEED_SERVICES) {
      if (s.category === "Lash Removal<3") continue;
      expect(guidesFor(s.category, s.name).length, s.name).toBeGreaterThan(0);
    }
    expect(guidesFor("Waxing!", "Chin Wax!").map((g) => g.id)).toEqual(["waxing"]);
    expect(guidesFor("Korean Lash Lifts", "Korean Lash lift (ONLY)<3").map((g) => g.id)).toEqual(["lashes"]);
    expect(guidesFor("Lash Lift + Brow Packages<3", "Lash Lift + Brow Lamination").map((g) => g.id).sort()).toEqual(["brows", "lashes"]);
  });
});
