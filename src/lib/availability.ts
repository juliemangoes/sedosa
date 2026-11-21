import { DateTime } from "luxon";
import type { DayInterval, WeeklyHours } from "@/db/schema";

/** A span of time that cannot be booked. locationId null = blocks every location. */
export type Busy = { locationId: number | null; start: Date; end: Date };

export type LocationHours = {
  id: number;
  weeklyHours: WeeklyHours;
  /** date (YYYY-MM-DD) → hours replacing the weekly hours that day ([] = closed). */
  overrides: Record<string, DayInterval[]>;
};

export type AvailabilityInput = {
  timezone: string;
  now: Date;
  slotIntervalMin: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  /** Service + add-ons. */
  durationMin: number;
  paddingBeforeMin: number;
  paddingAfterMin: number;
  /** Only the locations that offer the service (in display order). */
  locations: LocationHours[];
  busy: Busy[];
};

export type Slot = { start: string; locationIds: number[] };

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$|^24:00$/;

export function parseHHMM(s: string): number {
  if (!HHMM.test(s)) throw new Error(`Invalid time "${s}"`);
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export function hoursForDate(loc: LocationHours, date: string, timezone: string): DayInterval[] {
  if (Object.prototype.hasOwnProperty.call(loc.overrides, date)) return loc.overrides[date];
  const weekday = DateTime.fromISO(date, { zone: timezone }).weekday; // 1 = Mon … 7 = Sun
  return loc.weeklyHours[String(weekday)] ?? [];
}

/** Last date (inclusive, studio time) that can be booked. */
export function lastBookableDate(input: Pick<AvailabilityInput, "now" | "timezone" | "maxDaysAhead">): string {
  return DateTime.fromJSDate(input.now, { zone: input.timezone }).plus({ days: input.maxDaysAhead }).toISODate()!;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/** True if this location can take an appointment starting at `start` (epoch ms), ignoring business hours. */
function isFree(input: AvailabilityInput, locationId: number, start: number): boolean {
  const blockStart = start - input.paddingBeforeMin * 60_000;
  const blockEnd = start + (input.durationMin + input.paddingAfterMin) * 60_000;
  for (const b of input.busy) {
    if (b.locationId !== null && b.locationId !== locationId) continue;
    if (overlaps(blockStart, blockEnd, b.start.getTime(), b.end.getTime())) return false;
  }
  return true;
}

/** Bookable start times on one date (studio time zone), merged across locations. */
export function slotsForDate(input: AvailabilityInput, date: string): Slot[] {
  const zone = input.timezone;
  const day = DateTime.fromISO(date, { zone });
  if (!day.isValid) return [];
  if (date > lastBookableDate(input)) return [];
  const earliest = input.now.getTime() + input.minNoticeMinutes * 60_000;

  const byStart = new Map<number, number[]>();
  for (const loc of input.locations) {
    for (const iv of hoursForDate(loc, date, zone)) {
      const open = parseHHMM(iv.start);
      const close = parseHHMM(iv.end);
      for (let m = open; m + input.durationMin <= close; m += input.slotIntervalMin) {
        // Build from wall-clock time so DST days get correct local times.
        const t = day.set({ hour: Math.floor(m / 60), minute: m % 60, second: 0, millisecond: 0 });
        if (t.toISODate() !== date || t.hour * 60 + t.minute !== m) continue; // skipped by DST jump
        const ms = t.toMillis();
        if (ms < earliest) continue;
        if (!isFree(input, loc.id, ms)) continue;
        const list = byStart.get(ms) ?? [];
        if (!list.includes(loc.id)) list.push(loc.id);
        byStart.set(ms, list);
      }
    }
  }
  return [...byStart.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ms, locationIds]) => ({ start: new Date(ms).toISOString(), locationIds }));
}

export function slotsForRange(input: AvailabilityInput, startDate: string, days: number) {
  const out: { date: string; slots: Slot[] }[] = [];
  let d = DateTime.fromISO(startDate, { zone: input.timezone });
  for (let i = 0; i < days; i++) {
    const date = d.toISODate()!;
    out.push({ date, slots: slotsForDate(input, date) });
    d = d.plus({ days: 1 });
  }
  return out;
}

/** First date from `fromDate` with at least one open slot, or null within the booking window. */
export function firstAvailableDate(input: AvailabilityInput, fromDate: string): string | null {
  const last = lastBookableDate(input);
  let d = DateTime.fromISO(fromDate, { zone: input.timezone });
  while (d.toISODate()! <= last) {
    if (slotsForDate(input, d.toISODate()!).length) return d.toISODate()!;
    d = d.plus({ days: 1 });
  }
  return null;
}

/** Locations (in preference order) that can take a booking at exactly this start time. */
export function locationsForStart(input: AvailabilityInput, start: Date): number[] {
  const date = DateTime.fromJSDate(start, { zone: input.timezone }).toISODate()!;
  const slot = slotsForDate(input, date).find((s) => s.start === start.toISOString());
  if (!slot) return [];
  const order = input.locations.map((l) => l.id);
  return [...slot.locationIds].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}
