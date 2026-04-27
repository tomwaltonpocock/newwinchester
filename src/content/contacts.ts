/**
 * Recipients pre-filled into the "Email decision-makers" mailto link.
 *
 * IMPORTANT — verify before launch:
 *   - All addresses must be current and willing recipients of public feedback.
 *   - Removing anyone here just means residents won't email them by default;
 *     they can still edit the recipient list in their own email client.
 *   - Whether to include the private development partner is a campaign
 *     decision, not a default. The current entry is a placeholder.
 */

export function getCouncilEmails(): string[] {
  const raw = process.env.COUNCIL_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes("@"));
}

export function getCampaignInbox(): string | null {
  const v = process.env.USER_CAMPAIGN_INBOX?.trim();
  return v && v.includes("@") ? v : null;
}

export const contactCategories = [
  "Media",
  "I can help",
  "Event / meeting",
  "Technical problem",
  "Privacy / data request",
  "Other",
] as const;

export type ContactCategory = (typeof contactCategories)[number];
