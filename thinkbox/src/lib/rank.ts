// Pure ranking logic for decision cards. Kept dependency-free for unit tests.

export type RankInput = {
  magnitude: number;        // 1..5 model-scored
  rankAdjust: number;       // user's up/down votes on this card
  senderBias: number;       // learned bias for this sender (-2..2 typical)
  kindBias: number;         // learned bias for this kind of decision
  ageHours: number;         // time since last inbound message
  needsReplyBy?: Date | null;
  now?: Date;
};

/**
 * Effective rank: magnitude anchors it, user adjustments dominate, learned
 * biases nudge, urgency (deadline proximity, mild aging) breaks ties.
 * Higher = shown first.
 */
export function effectiveRank(i: RankInput): number {
  const now = i.now ?? new Date();
  let r = i.magnitude * 10;
  r += i.rankAdjust * 8;          // explicit user signal is strongest
  r += i.senderBias * 3;
  r += i.kindBias * 2;
  r += Math.min(i.ageHours / 24, 5); // gentle aging, capped at +5
  if (i.needsReplyBy) {
    const hoursLeft = (i.needsReplyBy.getTime() - now.getTime()) / 3600_000;
    if (hoursLeft < 0) r += 15;
    else if (hoursLeft < 24) r += 10;
    else if (hoursLeft < 72) r += 5;
  }
  return Math.round(r * 100) / 100;
}

/** Exponential-moving-average update for learned bias when the user re-ranks. */
export function updateBias(current: number, samples: number, direction: 1 | -1): { bias: number; samples: number } {
  const alpha = 1 / Math.min(samples + 1, 10);
  const target = direction * 2;
  return {
    bias: Math.round((current + alpha * (target - current)) * 1000) / 1000,
    samples: samples + 1,
  };
}
