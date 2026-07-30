import { describe, expect, it } from "vitest";
import { computeFreeSlots, describeSlots } from "@/lib/slots";

describe("computeFreeSlots", () => {
  const now = new Date(2026, 6, 27, 8, 0); // Monday 27 July 2026, 08:00 local
  it("skips busy blocks and weekends", () => {
    const busy = [{ start: new Date(2026, 6, 27, 9, 0).toISOString(), end: new Date(2026, 6, 27, 12, 0).toISOString() }];
    const slots = computeFreeSlots({ busy, days: 7, now });
    // nothing during the busy block
    expect(
      slots.some((s) => s.start.getTime() < new Date(2026, 6, 27, 12, 0).getTime() && s.end.getTime() > new Date(2026, 6, 27, 9, 0).getTime())
    ).toBe(false);
    // no Saturday/Sunday
    expect(slots.some((s) => [0, 6].includes(s.start.getDay()))).toBe(false);
    // still offers Monday afternoon
    expect(slots.some((s) => s.start.getDay() === 1 && s.start.getHours() >= 12)).toBe(true);
  });

  it("requires an hour's notice", () => {
    const slots = computeFreeSlots({ busy: [], days: 1, now: new Date(2026, 6, 27, 10, 0) });
    expect(slots.every((s) => s.start.getTime() >= new Date(2026, 6, 27, 11, 0).getTime())).toBe(true);
  });
});

describe("describeSlots", () => {
  it("groups by day, readable phrasing", () => {
    const text = describeSlots(
      [
        { start: new Date(Date.UTC(2026, 6, 27, 9, 0)), end: new Date(Date.UTC(2026, 6, 27, 9, 30)) },
        { start: new Date(Date.UTC(2026, 6, 27, 14, 0)), end: new Date(Date.UTC(2026, 6, 27, 14, 30)) },
      ],
      "UTC"
    );
    expect(text).toContain("Monday 27 July");
    expect(text).toContain("9:00");
    expect(text).toContain("14:00");
  });
});
