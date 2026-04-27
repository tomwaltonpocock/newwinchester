import { describe, it, expect } from "vitest";
import { scoreSubmission } from "../../src/lib/validation";

const base = {
  postcodeStatus: "winchester_city" as const,
  postcodeOutwardAllowed: true,
  ipCountry: "GB",
  ipRegion: "Hampshire",
  ipCity: "Winchester",
  uniqueParticipantInWindow: true,
  duplicateParticipantInWindow: false,
  repeatedIpBeyondThreshold: false,
  turnstilePassed: true,
  honeypotEmpty: true,
};

describe("scoreSubmission", () => {
  it("scores a higher-confidence local submission", () => {
    const r = scoreSubmission(base);
    expect(r.rejected).toBe(false);
    expect(r.score).toBeGreaterThanOrEqual(65);
    expect(r.category).toBe("higher");
  });

  it("rejects when turnstile fails", () => {
    const r = scoreSubmission({ ...base, turnstilePassed: false });
    expect(r.rejected).toBe(true);
    expect(r.rejectionReason).toBe("turnstile_failed");
  });

  it("rejects when honeypot is filled", () => {
    const r = scoreSubmission({ ...base, honeypotEmpty: false });
    expect(r.rejected).toBe(true);
    expect(r.rejectionReason).toBe("honeypot_filled");
  });

  it("penalises duplicate participant", () => {
    const r = scoreSubmission({
      ...base,
      uniqueParticipantInWindow: false,
      duplicateParticipantInWindow: true,
    });
    expect(r.score).toBeLessThan(scoreSubmission(base).score);
  });

  it("classifies non-local UK as plausible", () => {
    const r = scoreSubmission({
      ...base,
      postcodeStatus: "uk_other",
      postcodeOutwardAllowed: false,
      ipRegion: null,
      ipCity: null,
    });
    expect(r.category).toBe("plausible");
  });
});
