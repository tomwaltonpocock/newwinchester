import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase";
import { hmac } from "@/lib/crypto";
import { geoFromHeaders } from "@/lib/geo";
import { checkComplete, logEvent, repeatedIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { parsePostcode } from "@/lib/postcode";
import { scoreSubmission } from "@/lib/validation";
import { subscribeWithDoubleOptIn } from "@/lib/mailchimp";
import { env, assertServerEnv } from "@/lib/env";
import { missingInfoOptions } from "@/content/missingInfoOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PairResp = z.object({
  imagePairId: z.string().min(1).max(80),
  pairOrder: z.number().int().min(0).max(50),
  leftKind: z.enum(["developer", "refined"]),
  rightKind: z.enum(["developer", "refined"]),
  preference: z.enum(["developer", "refined", "no_preference"]).nullable(),
  comment: z.string().max(900).optional().nullable(),
});

const RatingOrNull = z.union([z.number().int().min(1).max(5), z.null()]);

const Body = z.object({
  submissionId: z.string().uuid(),
  publicToken: z.string().min(8),
  participantToken: z.string().min(8),
  honeypot: z.string().max(0).default(""), // must be empty
  turnstileToken: z.string().optional().nullable(),
  pairs: z.array(PairResp).max(20),
  overall: z.object({
    older: RatingOrNull,
    current: RatingOrNull,
    refined: RatingOrNull,
    generalComment: z.string().max(1200).optional().nullable(),
  }),
  missing: z.object({
    options: z.array(z.string().max(120)).max(20),
    comment: z.string().max(1200).optional().nullable(),
  }),
  postcode: z.string().max(20).optional().nullable(),
  email: z.string().email().max(254).optional().nullable(),
  consentEmail: z.boolean().optional(),
  consentShareCouncil: z.boolean().optional(),
  consentPublicSummary: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  assertServerEnv();
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid_body", detail: (e as Error).message }, { status: 400 });
  }

  const { ipHash, country, region, city } = geoFromHeaders(req.headers);
  const participantHash = hmac(body.participantToken);

  // Reject filled honeypot up-front (extra defence; zod also enforces empty).
  if (body.honeypot && body.honeypot.length > 0) {
    return NextResponse.json({ error: "rejected", reason: "honeypot" }, { status: 400 });
  }

  // Turnstile (optional).
  const ts = await verifyTurnstile(body.turnstileToken ?? null);
  if (!ts.passed) {
    return NextResponse.json({ error: "turnstile_failed", reason: ts.reason }, { status: 400 });
  }

  // Rate / dedupe.
  const limit = await checkComplete(participantHash);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", reason: limit.reason }, { status: 429 });
  }
  const ipRepeated = await repeatedIp(ipHash);

  // Postcode parse.
  const parsed = parsePostcode(body.postcode ?? null, env.validation.allowedPostcodeOutwards);
  const postcodeOutwardAllowed =
    !!parsed.outward && env.validation.allowedPostcodeOutwards.includes(parsed.outward);

  // Validation score.
  const v = scoreSubmission({
    postcodeStatus: parsed.status,
    postcodeOutwardAllowed,
    ipCountry: country,
    ipRegion: region,
    ipCity: city,
    uniqueParticipantInWindow: !limit.duplicate,
    duplicateParticipantInWindow: limit.duplicate,
    repeatedIpBeyondThreshold: ipRepeated,
    turnstilePassed: ts.passed,
    honeypotEmpty: true,
  });

  // Filter missing-info options against the canonical list.
  const allowedMissing = new Set<string>(missingInfoOptions);
  const missing = body.missing.options.filter((o) => allowedMissing.has(o));

  const supabase = getServiceClient();

  // Verify the submission exists and matches the public token.
  const { data: existing, error: existsErr } = await supabase
    .from("submissions")
    .select("id, public_token, completed_at")
    .eq("id", body.submissionId)
    .maybeSingle();
  if (existsErr || !existing || existing.public_token !== body.publicToken) {
    return NextResponse.json({ error: "submission_not_found" }, { status: 404 });
  }
  if (existing.completed_at) {
    return NextResponse.json({ error: "already_completed" }, { status: 409 });
  }

  let mailchimpStatus: string | null = null;
  let mailchimpMemberId: string | null = null;
  let emailHash: string | null = null;
  if (body.email && body.consentEmail) {
    emailHash = hmac(body.email.trim().toLowerCase());
    const sub = await subscribeWithDoubleOptIn(body.email, "submission");
    mailchimpStatus = sub.status;
    mailchimpMemberId = sub.memberId ?? null;
  }

  const update = {
    completed_at: new Date().toISOString(),
    postcode_outward: parsed.outward,
    postcode_sector: parsed.sector,
    postcode_full: env.validation.storeFullPostcode ? parsed.full : null,
    postcode_status: parsed.status,
    validation_score: v.score,
    validation_category: v.category,
    duplicate_flag: limit.duplicate,
    suspicious_reasons: v.reasons,
    overall_old_rating: body.overall.older,
    overall_current_rating: body.overall.current,
    overall_refined_rating: body.overall.refined,
    missing_info: missing,
    missing_info_comment: body.missing.comment ?? null,
    general_comment: body.overall.generalComment ?? null,
    consent_share_council: !!body.consentShareCouncil,
    consent_public_summary: !!body.consentPublicSummary,
    consent_updates: !!body.consentEmail,
    mailchimp_status: mailchimpStatus,
    mailchimp_member_id: mailchimpMemberId,
    email_hash: emailHash,
  };

  const { error: updateErr } = await supabase
    .from("submissions")
    .update(update)
    .eq("id", body.submissionId);

  if (updateErr) {
    return NextResponse.json({ error: "db_error", detail: updateErr.message }, { status: 500 });
  }

  // Pair responses (idempotent on submission_id+image_pair_id).
  if (body.pairs.length > 0) {
    const rows = body.pairs.map((p) => ({
      submission_id: body.submissionId,
      image_pair_id: p.imagePairId,
      pair_order: p.pairOrder,
      left_kind: p.leftKind,
      right_kind: p.rightKind,
      preference: p.preference,
      comment: p.comment ?? null,
    }));
    const { error: pairsErr } = await supabase
      .from("pair_responses")
      .upsert(rows, { onConflict: "submission_id,image_pair_id" });
    if (pairsErr) {
      return NextResponse.json({ error: "db_error", detail: pairsErr.message }, { status: 500 });
    }
  }

  await logEvent({ ipHash, participantHash, eventType: "submission_complete" });

  // Build summary numbers used for the mailto auto-summary on the thank-you page.
  let preferredRefined = 0;
  let preferredDeveloper = 0;
  let noPreference = 0;
  for (const p of body.pairs) {
    if (p.preference === "refined") preferredRefined++;
    else if (p.preference === "developer") preferredDeveloper++;
    else if (p.preference === "no_preference") noPreference++;
  }

  const shareUrl = body.consentShareCouncil
    ? `${env.siteUrl.replace(/\/$/, "")}/s/${existing.public_token}`
    : null;

  return NextResponse.json({
    ok: true,
    publicToken: existing.public_token,
    validationCategory: v.category,
    summary: {
      total: body.pairs.length,
      preferredRefined,
      preferredDeveloper,
      noPreference,
    },
    shareUrl,
  });
}
