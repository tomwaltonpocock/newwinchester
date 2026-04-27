export type SubmissionRow = {
  id: string;
  public_token: string;
  created_at: string;
  completed_at: string | null;
  source: string | null;
  referrer: string | null;
  utm: Record<string, string> | null;
  user_agent_hash: string | null;
  ip_hash: string | null;
  participant_hash: string | null;
  postcode_outward: string | null;
  postcode_sector: string | null;
  postcode_full: string | null;
  postcode_status:
    | "winchester_city"
    | "winchester_district_or_nearby"
    | "uk_other"
    | "invalid_or_missing"
    | null;
  geo_country: string | null;
  geo_region: string | null;
  geo_city: string | null;
  validation_score: number;
  validation_category: "low" | "plausible" | "higher" | null;
  duplicate_flag: boolean;
  suspicious_reasons: string[];
  missing_info: string[];
  missing_info_comment: string | null;
  general_comment: string | null;
  consent_share_council: boolean;
  consent_public_summary: boolean;
  consent_updates: boolean;
  mailchimp_status: string | null;
  mailchimp_member_id: string | null;
  email_hash: string | null;
  submitted_version: string;
  mailto_clicked_at: string | null;
  council_share_viewed_count: number;
};

export type AspectResponseRow = {
  id: string;
  submission_id: string;
  aspect_n: number;
  display_order: number[];
  star_developer: number | null;
  star_alt_1: number | null;
  star_alt_2: number | null;
  star_alt_3: number | null;
  comment: string | null;
  created_at: string;
};
