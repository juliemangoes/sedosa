import type { DayInterval, WeeklyHours } from "@/db/schema";

/** Title-cases ALL-CAPS text, keeping short words like "PMU" as they are. */
function softenCaps(s: string): string {
  if (s !== s.toUpperCase() || !/[A-Z]{4,}/.test(s)) return s;
  return s.replace(/[A-Z]{4,}/g, (w) => w[0] + w.slice(1).toLowerCase());
}

/** Service names as written by the studio, with "<3" shown as a heart. */
export function prettyName(name: string): string {
  return softenCaps(name.replace(/\s*<3/g, " ♡").trim());
}

/** Short category label for filter chips: drops trailing emoticons ("<3", ":)", kaomoji). */
export function categoryLabel(name: string): string {
  let s = name.trim();
  for (;;) {
    // Keeps ordinary (incl. accented) letters and digits; drops hearts, kaomoji and the like.
    const next = s.replace(/(\s|<3|:\)|[^A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F)\]])+$/u, "");
    if (next === s) break;
    s = next;
  }
  return softenCaps(s || name);
}

/** 65 → "1 hr 5 min" */
export function shortDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** 9500 → "$95", 950 → "$9.50", 0 → "Free" */
export function priceLabel(cents: number): string {
  if (cents <= 0) return "Free";
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/** "2843 Fairview rd, Covington GA 30016" → "Covington, GA" */
export function cityFromAddress(address: string): string | null {
  const m = /([A-Za-z][A-Za-z .'-]*?)\s*,?\s+([A-Z]{2})\s+\d{5}(?:-\d{4})?\s*$/.exec(address);
  if (!m) return null;
  const parts = m[1].split(",");
  const city = parts[parts.length - 1].trim();
  return city ? `${city}, ${m[2]}` : null;
}

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hr = h % 12 || 12;
  const ap = h < 12 || h === 24 ? "AM" : "PM";
  return m ? `${hr}:${String(m).padStart(2, "0")} ${ap}` : `${hr} ${ap}`;
}

function fmtIntervals(ivs: DayInterval[]): string {
  return ivs.map((i) => `${fmtTime(i.start)} – ${fmtTime(i.end)}`).join(", ");
}

export type HoursRow = { days: string; hours: string; closed: boolean };

/** Groups consecutive weekdays with identical hours: "Mon – Sat · 9:30 AM – 8 PM", "Sun · Closed". */
export function hoursRows(weekly: WeeklyHours): HoursRow[] {
  const rows: { from: number; to: number; text: string }[] = [];
  for (let d = 1; d <= 7; d++) {
    const ivs = weekly[String(d)] ?? [];
    const text = ivs.length ? fmtIntervals(ivs) : "Closed";
    const last = rows[rows.length - 1];
    if (last && last.text === text && last.to === d - 1) last.to = d;
    else rows.push({ from: d, to: d, text });
  }
  return rows.map((r) => ({
    days: r.from === r.to ? DAY_SHORT[r.from - 1] : `${DAY_SHORT[r.from - 1]} – ${DAY_SHORT[r.to - 1]}`,
    hours: r.text,
    closed: r.text === "Closed",
  }));
}

/** schema.org openingHours strings, e.g. "Mo-Sa 09:30-20:00". */
export function openingHoursSpec(weekly: WeeklyHours): string[] {
  const codes = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const out: string[] = [];
  for (let d = 1; d <= 7; d++) for (const iv of weekly[String(d)] ?? []) out.push(`${codes[d - 1]} ${iv.start}-${iv.end}`);
  return out;
}

/** ["Covington, GA", "Decatur, GA"] → "Covington & Decatur, GA" */
export function placesLabel(cities: (string | null)[]): string {
  const parsed = [...new Set(cities.filter((c): c is string => !!c))].map((c) => {
    const [city, state] = c.split(",").map((s) => s.trim());
    return { city, state };
  });
  if (!parsed.length) return "";
  const states = [...new Set(parsed.map((p) => p.state))];
  if (states.length === 1) {
    const names = parsed.map((p) => p.city);
    const joined = names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : names[0];
    return `${joined}, ${states[0]}`;
  }
  return parsed.map((p) => `${p.city}, ${p.state}`).join(" & ");
}
