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

const Star = z.union([z.number().int().min(1).max(5), z.null()]);

const AspectResp = z.object({
  aspectN: z.number().int().min(1).max(999),
  displayOrder: z.array(z.number().int().min(1).max(3)).max(3).default([]),
  starDeveloper: Star,
  starAlt1: Star,
  starAlt2: Star,
  starAlt3: Star,
  comment: z.string().max(900).nullable().optional(),
});

const Body = z.object({
  submissionId: z.string().uuid(),
  publicToken: z.string().min(8),
  participantToken: z.string().min(8),
  honeypot: z.string().max(0).default(""),
  turnstileToken: z.string().nullable().optional(),
  aspects: z.array(AspectResp).max(40),
  generalComment: z.string().max(1200).nullable().optional(),
  missing: z.object({
    options: z.array(z.string().max(120)).max(20),
    comment: z.string().max(1200).nullable().optional(),
  }),
  postcode: z.string().max(20).nullable().optional(),
  email: z.string().email().max(254).nullable().optional(),
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

  if (body.honeypot.length > 0) {
    return NextResponse.json({ error: "rejected", reason: "honeypot" }, { status: 400 });
  }

  const ts = await verifyTurnstile(body.turnstileToken ?? null);
  if (!ts.passed) {
    return NextResponse.json({ error: "turnstile_failed", reason: ts.reason }, { status: 400 });
  }

  const limit = await checkComplete(participantHash);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", reason: limit.reason }, { status: 429 });
  }
  const ipRepeated = await repeatedIp(ipHash);

  const parsed = parsePostcode(body.postcode ?? null, env.validation.allowedPostcodeOutwards);
  const postcodeOutwardAllowed =
    !!parsed.outward && env.validation.allowedPostcodeOutwards.includes(parsed.outward);

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

  const allowedMissing = new Set<string>(missingInfoOptions);
  const missing = body.missing.options.filter((o) => allowedMissing.has(o));

  const supabase = getServiceClient();

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
    missing_info: missing,
    missing_info_comment: body.missing.comment ?? null,
    general_comment: body.generalComment ?? null,
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

  if (body.aspects.length > 0) {
    const rows = body.aspects.map((a) => ({
      submission_id: body.submissionId,
      aspect_n: a.aspectN,
      display_order: a.displayOrder,
      star_developer: a.starDeveloper,
      star_alt_1: a.starAlt1,
      star_alt_2: a.starAlt2,
      star_alt_3: a.starAlt3,
      comment: a.comment ?? null,
    }));
    const { error: aspErr } = await supabase
      .from("aspect_responses")
      .upsert(rows, { onConflict: "submission_id,aspect_n" });
    if (aspErr) {
      return NextResponse.json({ error: "db_error", detail: aspErr.message }, { status: 500 });
    }
  }

  await logEvent({ ipHash, participantHash, eventType: "submission_complete" });

  // Auto-summary for the mailto: how many aspects had highest rating on alt vs developer.
  let preferredAlternative = 0;
  let preferredCurrent = 0;
  let tieOrUnrated = 0;
  for (const a of body.aspects) {
    const dev = a.starDeveloper ?? -1;
    const altMax = Math.max(a.starAlt1 ?? -1, a.starAlt2 ?? -1, a.starAlt3 ?? -1);
    if (dev < 0 && altMax < 0) tieOrUnrated++;
    else if (altMax > dev) preferredAlternative++;
    else if (dev > altMax) preferredCurrent++;
    else tieOrUnrated++;
  }

  const shareUrl = body.consentShareCouncil
    ? `${env.siteUrl.replace(/\/$/, "")}/s/${existing.public_token}`
    : null;

  return NextResponse.json({
    ok: true,
    publicToken: existing.public_token,
    validationCategory: v.category,
    summary: {
      total: body.aspects.length,
      preferredAlternative,
      preferredCurrent,
      tieOrUnrated,
    },
    shareUrl,
  });
}
