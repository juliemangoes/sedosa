import { DateTime } from "luxon";

export function money(cents: number): string {
  return `${cents < 0 ? "−\u2009" : ""}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

/** 65 → "1 hour 5 minutes" (matches how the studio's menu has always read). */
export function duration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m || !h) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  return parts.join(" ");
}

export function inZone(d: Date | string, zone: string): DateTime {
  return (typeof d === "string" ? DateTime.fromISO(d) : DateTime.fromJSDate(d)).setZone(zone);
}

/** "Monday, November 23rd, 2026 at 10:00 AM EST" */
export function longDateTime(d: Date | string, zone: string): string {
  const dt = inZone(d, zone);
  return `${dt.toFormat("cccc, LLLL")} ${ordinal(dt.day)}, ${dt.toFormat("yyyy 'at' h:mm a ZZZZ")}`;
}

export function timeLabel(d: Date | string, zone: string): string {
  return inZone(d, zone).toFormat("h:mm a");
}

export function shortDate(d: Date | string, zone: string): string {
  return inZone(d, zone).toFormat("ccc, LLL d");
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function zoneLabel(zone: string, at = new Date()): string {
  const dt = DateTime.fromJSDate(at).setZone(zone);
  return `${dt.offsetNameLong ?? zone} (GMT${dt.toFormat("ZZ")})`;
}

/** Normalizes US phone numbers to E.164 (+1XXXXXXXXXX); leaves others with a leading +. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  const d = digits.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return d ? `+${d}` : "";
}

export function prettyPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
