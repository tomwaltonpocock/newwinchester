import { getServiceClient } from "./supabase";

export type RateLimitCheck = {
  allowed: boolean;
  reason?: string;
  count?: number;
};

/**
 * Server-side rate limit using rate_limit_events. Best-effort, not strictly
 * atomic — for this civic survey that's acceptable.
 */
export async function logEvent(args: {
  ipHash?: string | null;
  participantHash?: string | null;
  eventType: string;
}) {
  try {
    await getServiceClient().from("rate_limit_events").insert({
      ip_hash: args.ipHash ?? null,
      participant_hash: args.participantHash ?? null,
      event_type: args.eventType,
    });
  } catch {
    /* swallow */
  }
}

async function countEvents(args: {
  field: "ip_hash" | "participant_hash";
  value: string;
  eventType: string;
  windowSeconds: number;
}): Promise<number> {
  const since = new Date(Date.now() - args.windowSeconds * 1000).toISOString();
  const { count } = await getServiceClient()
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq(args.field, args.value)
    .eq("event_type", args.eventType)
    .gte("created_at", since);
  return count ?? 0;
}

const LIMITS = {
  start_per_ip_hour: { eventType: "submission_start", windowSeconds: 3600, max: 5 },
  complete_per_participant_day: {
    eventType: "submission_complete",
    windowSeconds: 86400,
    max: 2,
  },
  contact_per_ip_day: { eventType: "contact_message", windowSeconds: 86400, max: 5 },
};

export async function checkStart(ipHash: string | null): Promise<RateLimitCheck> {
  if (!ipHash) return { allowed: true };
  const c = await countEvents({
    field: "ip_hash",
    value: ipHash,
    eventType: LIMITS.start_per_ip_hour.eventType,
    windowSeconds: LIMITS.start_per_ip_hour.windowSeconds,
  });
  if (c >= LIMITS.start_per_ip_hour.max) {
    return { allowed: false, reason: "ip_start_rate_exceeded", count: c };
  }
  return { allowed: true, count: c };
}

export async function checkComplete(
  participantHash: string | null
): Promise<RateLimitCheck & { duplicate: boolean }> {
  if (!participantHash) return { allowed: true, duplicate: false };
  const c = await countEvents({
    field: "participant_hash",
    value: participantHash,
    eventType: LIMITS.complete_per_participant_day.eventType,
    windowSeconds: LIMITS.complete_per_participant_day.windowSeconds,
  });
  return {
    allowed: c < LIMITS.complete_per_participant_day.max,
    reason: c >= LIMITS.complete_per_participant_day.max ? "participant_complete_rate_exceeded" : undefined,
    count: c,
    duplicate: c >= 1,
  };
}

export async function checkRecipientMessage(
  ipHash: string | null,
  recipientId: string
): Promise<RateLimitCheck> {
  if (!ipHash) return { allowed: true };
  const eventType = `recipient_message:${recipientId}`;
  const c = await countEvents({
    field: "ip_hash",
    value: ipHash,
    eventType,
    windowSeconds: 86400,
  });
  // Cap: 3 messages per IP per recipient per 24h.
  if (c >= 3) {
    return { allowed: false, reason: "ip_recipient_message_rate_exceeded", count: c };
  }
  return { allowed: true, count: c };
}

export async function checkContact(ipHash: string | null): Promise<RateLimitCheck> {
  if (!ipHash) return { allowed: true };
  const c = await countEvents({
    field: "ip_hash",
    value: ipHash,
    eventType: LIMITS.contact_per_ip_day.eventType,
    windowSeconds: LIMITS.contact_per_ip_day.windowSeconds,
  });
  if (c >= LIMITS.contact_per_ip_day.max) {
    return { allowed: false, reason: "ip_contact_rate_exceeded", count: c };
  }
  return { allowed: true, count: c };
}

/** Loose threshold for "repeated IP beyond normal" — used only as a validation signal. */
export async function repeatedIp(ipHash: string | null): Promise<boolean> {
  if (!ipHash) return false;
  const c = await countEvents({
    field: "ip_hash",
    value: ipHash,
    eventType: LIMITS.start_per_ip_hour.eventType,
    windowSeconds: 86400,
  });
  return c > 8;
}
