// Relationship warmth. Pure logic, unit-testable.
//
// Core idea: a relationship isn't "cold" after N weeks in the abstract — it's
// cold relative to ITS OWN cadence. We estimate a personal baseline (median gap
// between exchanges) and score how far past that baseline we currently are.

export type WarmthInput = {
  lastContactAt: Date | null;      // most recent of inbound/outbound
  medianGapDays: number | null;    // personal cadence baseline from history
  targetCadenceDays?: number | null; // manual override, wins if set
  toneScore?: number | null;       // -1..1 from tone analysis
  now?: Date;
};

export function medianGapDays(sortedDates: Date[]): number | null {
  if (sortedDates.length < 3) return null;
  const gaps: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const g = (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / 86400_000;
    if (g > 0.01) gaps.push(g);
  }
  if (!gaps.length) return null;
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
}

/**
 * Warmth 0..100. 100 = freshly in touch; ~60 = at cadence boundary;
 * decays as the silence stretches past the personal baseline.
 * Tone shifts the whole curve by up to ±10.
 */
export function warmthScore(i: WarmthInput): number {
  const now = i.now ?? new Date();
  if (!i.lastContactAt) return 0;
  const daysSince = (now.getTime() - i.lastContactAt.getTime()) / 86400_000;
  const baseline = i.targetCadenceDays ?? i.medianGapDays ?? 30;
  const cadence = Math.max(baseline, 3);
  // ratio 0 → 100 warmth; ratio 1 (at cadence) → ~60; ratio 2 → ~35; ratio 4 → ~12
  const ratio = daysSince / cadence;
  let w = 100 * Math.exp(-0.52 * ratio);
  w += (i.toneScore ?? 0) * 10;
  return Math.max(0, Math.min(100, Math.round(w)));
}

/** "Unduly aging": meaningfully past personal cadence, worth a nudge. */
export function isAging(i: WarmthInput): boolean {
  const now = i.now ?? new Date();
  if (!i.lastContactAt) return false;
  const daysSince = (now.getTime() - i.lastContactAt.getTime()) / 86400_000;
  const baseline = i.targetCadenceDays ?? i.medianGapDays ?? 30;
  return daysSince > Math.max(baseline, 3) * 1.6;
}
