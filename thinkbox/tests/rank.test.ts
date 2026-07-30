import { describe, expect, it } from "vitest";
import { effectiveRank, updateBias } from "@/lib/rank";

describe("effectiveRank", () => {
  it("orders by magnitude when nothing else differs", () => {
    const base = { rankAdjust: 0, senderBias: 0, kindBias: 0, ageHours: 0 };
    expect(effectiveRank({ ...base, magnitude: 5 })).toBeGreaterThan(effectiveRank({ ...base, magnitude: 2 }));
  });

  it("user up-rank beats one magnitude step", () => {
    const base = { senderBias: 0, kindBias: 0, ageHours: 0 };
    const upranked3 = effectiveRank({ ...base, magnitude: 3, rankAdjust: 2 });
    const plain4 = effectiveRank({ ...base, magnitude: 4, rankAdjust: 0 });
    expect(upranked3).toBeGreaterThan(plain4);
  });

  it("overdue deadlines add urgency", () => {
    const now = new Date("2026-07-30T12:00:00Z");
    const base = { magnitude: 3, rankAdjust: 0, senderBias: 0, kindBias: 0, ageHours: 0, now };
    const overdue = effectiveRank({ ...base, needsReplyBy: new Date("2026-07-29T12:00:00Z") });
    const relaxed = effectiveRank({ ...base, needsReplyBy: new Date("2026-08-20T12:00:00Z") });
    expect(overdue - relaxed).toBeGreaterThanOrEqual(15);
  });

  it("aging is gentle and capped", () => {
    const base = { magnitude: 3, rankAdjust: 0, senderBias: 0, kindBias: 0 };
    const fresh = effectiveRank({ ...base, ageHours: 0 });
    const ancient = effectiveRank({ ...base, ageHours: 24 * 60 });
    expect(ancient - fresh).toBeLessThanOrEqual(5);
  });
});

describe("updateBias", () => {
  it("moves toward the direction and converges", () => {
    let b = { bias: 0, samples: 0 };
    for (let i = 0; i < 10; i++) b = updateBias(b.bias, b.samples, 1);
    expect(b.bias).toBeGreaterThan(1);
    expect(b.bias).toBeLessThanOrEqual(2);
  });

  it("down-ranks go negative", () => {
    const b = updateBias(0, 0, -1);
    expect(b.bias).toBeLessThan(0);
  });
});
