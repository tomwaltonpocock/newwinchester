import type { PostcodeStatus } from "./postcode";

export type ValidationCategory = "low" | "plausible" | "higher";

export type ValidationInput = {
  postcodeStatus: PostcodeStatus;
  postcodeOutwardAllowed: boolean;
  ipCountry: string | null;
  ipRegion: string | null;
  ipCity: string | null;
  uniqueParticipantInWindow: boolean;
  duplicateParticipantInWindow: boolean;
  repeatedIpBeyondThreshold: boolean;
  turnstilePassed: boolean;
  honeypotEmpty: boolean;
  mailchimpDoubleOptInConfirmed?: boolean;
};

export type ValidationResult = {
  score: number;
  category: ValidationCategory;
  reasons: string[];
  rejected: boolean;
  rejectionReason?: string;
};

export function scoreSubmission(v: ValidationInput): ValidationResult {
  const reasons: string[] = [];
  if (!v.turnstilePassed) {
    return {
      score: 0,
      category: "low",
      reasons: ["turnstile_failed"],
      rejected: true,
      rejectionReason: "turnstile_failed",
    };
  }
  if (!v.honeypotEmpty) {
    return {
      score: 0,
      category: "low",
      reasons: ["honeypot_filled"],
      rejected: true,
      rejectionReason: "honeypot_filled",
    };
  }

  let score = 0;
  if (v.postcodeOutwardAllowed) {
    score += 35;
    reasons.push("postcode_in_allowed_outwards");
  } else if (v.postcodeStatus !== "invalid_or_missing") {
    score += 20;
    reasons.push("postcode_valid_uk");
  }
  if (v.ipCountry === "GB") {
    score += 15;
    reasons.push("ip_country_gb");
  }
  if (
    (v.ipRegion && /hampshire/i.test(v.ipRegion)) ||
    (v.ipCity && /winchester/i.test(v.ipCity))
  ) {
    score += 10;
    reasons.push("ip_region_or_city_local");
  }
  if (v.uniqueParticipantInWindow) {
    score += 10;
    reasons.push("unique_participant_in_window");
  }
  if (v.mailchimpDoubleOptInConfirmed) {
    score += 15;
    reasons.push("mailchimp_double_opt_in_confirmed");
  }
  if (v.duplicateParticipantInWindow) {
    score -= 25;
    reasons.push("duplicate_participant_in_window");
  }
  if (v.repeatedIpBeyondThreshold) {
    score -= 20;
    reasons.push("repeated_ip_beyond_threshold");
  }

  if (score < 0) score = 0;

  let category: ValidationCategory;
  if (score >= 65) category = "higher";
  else if (score >= 35) category = "plausible";
  else category = "low";

  return { score, category, reasons, rejected: false };
}
