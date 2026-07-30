import { describe, expect, it } from "vitest";
import { medianGapDays, warmthScore, isAging } from "@/lib/warmth";

const d = (s: string) => new Date(s);

describe("medianGapDays", () => {
  it("needs at least 3 datapoints", () => {
    expect(medianGapDays([d("2026-01-01"), d("2026-02-01")])).toBeNull();
  });
  it("computes the median gap", () => {
    const dates = [d("2026-01-01"), d("2026-01-11"), d("2026-01-21"), d("2026-02-20")];
    expect(medianGapDays(dates)).toBe(10);
  });
});

describe("warmthScore", () => {
  const now = d("2026-07-30");
  it("fresh contact is warm", () => {
    expect(warmthScore({ lastContactAt: d("2026-07-29"), medianGapDays: 30, now })).toBeGreaterThan(85);
  });
  it("a quarterly-cadence friend is NOT cold after six weeks", () => {
    const w = warmthScore({ lastContactAt: d("2026-06-15"), medianGapDays: 90, now });
    expect(w).toBeGreaterThan(60);
  });
  it("a weekly-cadence contact IS cooling after six weeks", () => {
    const w = warmthScore({ lastContactAt: d("2026-06-15"), medianGapDays: 7, now });
    expect(w).toBeLessThan(40);
  });
  it("manual target cadence overrides the learned baseline", () => {
    const learned = warmthScore({ lastContactAt: d("2026-06-01"), medianGapDays: 7, now });
    const overridden = warmthScore({ lastContactAt: d("2026-06-01"), medianGapDays: 7, targetCadenceDays: 120, now });
    expect(overridden).toBeGreaterThan(learned);
  });
  it("warm tone lifts the score", () => {
    const cold = warmthScore({ lastContactAt: d("2026-07-01"), medianGapDays: 30, toneScore: -1, now });
    const warm = warmthScore({ lastContactAt: d("2026-07-01"), medianGapDays: 30, toneScore: 1, now });
    expect(warm - cold).toBeGreaterThanOrEqual(15);
  });
});

describe("isAging", () => {
  const now = d("2026-07-30");
  it("respects personal cadence", () => {
    expect(isAging({ lastContactAt: d("2026-06-15"), medianGapDays: 90, now })).toBe(false);
    expect(isAging({ lastContactAt: d("2026-06-15"), medianGapDays: 14, now })).toBe(true);
  });
});
