import heroBrowMapping from "@/assets/photos/hero-brow-mapping.jpg";
import catBrows from "@/assets/photos/cat-brows.jpg";
import catLashLift from "@/assets/photos/cat-lash-lift.jpg";
import catPackages from "@/assets/photos/cat-packages.jpg";
import catLashRemoval from "@/assets/photos/cat-lash-removal.jpg";
import catPmu from "@/assets/photos/cat-pmu.jpg";

/*
 * Built-in photos (licensed by the owner, originals in /photos). They fill the
 * page until the owner adds their own in the dashboard: a hero under Photos
 * ("Use as hero"), a photo per category under Services.
 */

export const HERO_PHOTO = {
  image: heroBrowMapping,
  alt: "A brow artist measuring a client's brows with a ruler before shaping",
};

/** A built-in photo for a menu category, matched on its name, or null when none fits (waxing, for one). */
export function builtInCategoryPhoto(name: string): string | null {
  const n = name.toLowerCase();
  if (/pmu|microblad|ombr|powder/.test(n)) return catPmu.src;
  if (/removal/.test(n)) return catLashRemoval.src;
  if (/lash/.test(n) && /brow|package/.test(n)) return catPackages.src;
  if (/lash/.test(n)) return catLashLift.src;
  if (/brow/.test(n)) return catBrows.src;
  return null;
}
