import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  slotsForDate,
  firstAvailableDate,
  locationsForStart,
  type AvailabilityInput,
} from "@/lib/availability";

const TZ = "America/New_York";
const HOURS = {
  "1": [{ start: "09:30", end: "20:00" }],
  "2": [{ start: "09:30", end: "20:00" }],
  "3": [{ start: "09:30", end: "20:00" }],
  "4": [{ start: "09:30", end: "20:00" }],
  "5": [{ start: "09:30", end: "20:00" }],
  "6": [{ start: "09:30", end: "20:00" }],
  "7": [],
};
const local = (iso: string) => DateTime.fromISO(iso, { zone: TZ }).toJSDate();
const labels = (input: AvailabilityInput, date: string) =>
  slotsForDate(input, date).map((s) => DateTime.fromISO(s.start).setZone(TZ).toFormat("HH:mm"));

function base(over: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    timezone: TZ,
    now: local("2026-11-20T08:00"), // Friday
    slotIntervalMin: 30,
    minNoticeMinutes: 0,
    maxDaysAhead: 60,
    durationMin: 30,
    paddingBeforeMin: 0,
    paddingAfterMin: 0,
    locations: [{ id: 1, weeklyHours: HOURS, overrides: {} }],
    busy: [],
    ...over,
  };
}

describe("slotsForDate", () => {
  it("offers every 30 minutes within hours, ending by close", () => {
    const l = labels(base(), "2026-11-23"); // Monday
    expect(l[0]).toBe("09:30");
    expect(l.at(-1)).toBe("19:30");
    expect(l).toHaveLength(21);
  });

  it("long services must finish by closing time", () => {
    const l = labels(base({ durationMin: 300 }), "2026-11-23");
    expect(l.at(-1)).toBe("15:00");
  });

  it("is closed on Sunday", () => {
    expect(labels(base(), "2026-11-22")).toEqual([]);
  });

  it("respects minimum notice", () => {
    const l = labels(base({ now: local("2026-11-23T06:00"), minNoticeMinutes: 12 * 60 }), "2026-11-23");
    expect(l[0]).toBe("18:00");
  });

  it("does not offer past times today", () => {
    const l = labels(base({ now: local("2026-11-23T14:10") }), "2026-11-23");
    expect(l[0]).toBe("14:30");
  });

  it("blocks overlapping appointments, including padding", () => {
    const input = base({
      durationMin: 60,
      paddingAfterMin: 15,
      busy: [{ locationId: 1, start: local("2026-11-23T12:00"), end: local("2026-11-23T13:00") }],
    });
    const l = labels(input, "2026-11-23");
    // 10:30 + 60 + 15 = 11:45 OK; 11:00 + 75 = 12:15 overlaps
    expect(l).toContain("10:30");
    expect(l).not.toContain("11:00");
    expect(l).not.toContain("12:30");
    expect(l).toContain("13:00");
  });

  it("busy at another location does not block, but null location blocks all", () => {
    const two = [
      { id: 1, weeklyHours: HOURS, overrides: {} },
      { id: 2, weeklyHours: HOURS, overrides: {} },
    ];
    const other = base({ locations: two, busy: [{ locationId: 2, start: local("2026-11-23T10:00"), end: local("2026-11-23T11:00") }] });
    const ten = slotsForDate(other, "2026-11-23").find((s) => DateTime.fromISO(s.start).setZone(TZ).toFormat("HH:mm") === "10:00");
    expect(ten?.locationIds).toEqual([1]);

    const all = base({ locations: two, busy: [{ locationId: null, start: local("2026-11-23T10:00"), end: local("2026-11-23T11:00") }] });
    expect(labels(all, "2026-11-23")).not.toContain("10:00");
  });

  it("date overrides replace weekly hours (and can close a day)", () => {
    const closed = base({ locations: [{ id: 1, weeklyHours: HOURS, overrides: { "2026-11-26": [] } }] });
    expect(labels(closed, "2026-11-26")).toEqual([]);
    const sunday = base({ locations: [{ id: 1, weeklyHours: HOURS, overrides: { "2026-11-29": [{ start: "12:00", end: "14:00" }] } }] });
    expect(labels(sunday, "2026-11-29")).toEqual(["12:00", "12:30", "13:00", "13:30"]);
  });

  it("supports split shifts", () => {
    const split = { ...HOURS, "1": [{ start: "09:00", end: "10:00" }, { start: "15:00", end: "16:00" }] };
    expect(labels(base({ locations: [{ id: 1, weeklyHours: split, overrides: {} }] }), "2026-11-23")).toEqual([
      "09:00",
      "09:30",
      "15:00",
      "15:30",
    ]);
  });

  it("stops at the booking window", () => {
    const input = base({ maxDaysAhead: 3 });
    expect(labels(input, "2026-11-23").length).toBeGreaterThan(0);
    expect(labels(input, "2026-11-24")).toEqual([]);
  });

  it("produces correct UTC instants across the DST change", () => {
    // 2026-11-01 is the fall-back Sunday in New York; use a Saturday-like override to open it.
    const input = base({
      now: local("2026-10-25T08:00"),
      locations: [{ id: 1, weeklyHours: HOURS, overrides: { "2026-11-01": [{ start: "09:00", end: "10:00" }] } }],
    });
    const s = slotsForDate(input, "2026-11-01");
    expect(s[0].start).toBe("2026-11-01T14:00:00.000Z"); // 09:00 EST = 14:00Z
    const before = slotsForDate(input, "2026-10-31");
    expect(before[0].start).toBe("2026-10-31T13:30:00.000Z"); // 09:30 EDT = 13:30Z
  });
});

describe("helpers", () => {
  it("finds the first open date", () => {
    expect(firstAvailableDate(base({ now: local("2026-11-21T21:00") }), "2026-11-21")).toBe("2026-11-23");
  });

  it("orders locations by preference for a start time", () => {
    const two = [
      { id: 2, weeklyHours: HOURS, overrides: {} },
      { id: 1, weeklyHours: HOURS, overrides: {} },
    ];
    expect(locationsForStart(base({ locations: two }), local("2026-11-23T10:00"))).toEqual([2, 1]);
    expect(locationsForStart(base({ locations: two }), local("2026-11-23T10:10"))).toEqual([]);
  });
});
