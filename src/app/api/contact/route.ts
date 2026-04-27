import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase";
import { encrypt, hmac } from "@/lib/crypto";
import { geoFromHeaders } from "@/lib/geo";
import { checkContact, logEvent } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendEmail } from "@/lib/resend";
import { contactCategories } from "@/content/contacts";
import { assertServerEnv, env } from "@/lib/env";
import { siteCopy } from "@/content/siteCopy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  category: z.enum(contactCategories),
  name: z.string().max(120).optional().nullable(),
  email: z.string().email().max(254).optional().nullable(),
  message: z.string().min(1).max(2000),
  participantToken: z.string().min(8).optional().nullable(),
  submissionPublicToken: z.string().min(8).optional().nullable(),
  honeypot: z.string().max(0).default(""),
  turnstileToken: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  assertServerEnv();
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (body.honeypot.length > 0) {
    return NextResponse.json({ error: "rejected" }, { status: 400 });
  }

  const { ipHash } = geoFromHeaders(req.headers);
  const limit = await checkContact(ipHash);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const ts = await verifyTurnstile(body.turnstileToken ?? null);
  if (!ts.passed) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 400 });
  }

  let emailHash: string | null = null;
  let emailCiphertext: string | null = null;
  if (body.email) {
    const lower = body.email.trim().toLowerCase();
    emailHash = hmac(lower);
    emailCiphertext = await encrypt(lower);
  }

  const participantHash = body.participantToken ? hmac(body.participantToken) : null;
  const supabase = getServiceClient();

  let submissionId: string | null = null;
  if (body.submissionPublicToken) {
    const { data } = await supabase
      .from("submissions")
      .select("id")
      .eq("public_token", body.submissionPublicToken)
      .maybeSingle();
    submissionId = data?.id ?? null;
  }

  const { error } = await supabase.from("contact_messages").insert({
    submission_id: submissionId,
    category: body.category,
    name: body.name ? body.name.slice(0, 120) : null,
    email_ciphertext: emailCiphertext,
    email_hash: emailHash,
    message: body.message,
    status: "new",
    ip_hash: ipHash,
    participant_hash: participantHash,
  });
  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  await logEvent({ ipHash, participantHash, eventType: "contact_message" });

  // Optional auto-acknowledgement + admin notification.
  if (env.resend.enabled) {
    if (body.email) {
      await sendEmail({
        to: body.email,
        subject: `Re: your message — ${siteCopy.brand.name}`,
        text: siteCopy.contact.success,
      });
    }
    if (env.resend.campaignInbox) {
      await sendEmail({
        to: env.resend.campaignInbox,
        subject: `[contact:${body.category}] new message`,
        text: `Category: ${body.category}\nFrom: ${body.name ?? "(no name)"} <${body.email ?? "(no email)"}>\n\n${body.message}`,
        replyTo: body.email ?? undefined,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
