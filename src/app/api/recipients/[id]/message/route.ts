import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase";
import { encrypt, hmac } from "@/lib/crypto";
import { geoFromHeaders } from "@/lib/geo";
import { checkRecipientMessage, logEvent } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendEmail } from "@/lib/resend";
import { classifyMessage } from "@/lib/moderation";
import { getRecipient, getRecipientEmail } from "@/content/recipients";
import { assertServerEnv, env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().max(120).optional().nullable(),
  email: z.string().email().max(254).optional().nullable(),
  message: z.string().min(20).max(2000),
  honeypot: z.string().max(0).default(""),
  turnstileToken: z.string().optional().nullable(),
  participantToken: z.string().min(8).optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  assertServerEnv();
  const recipient = getRecipient(params.id);
  if (!recipient) return NextResponse.json({ error: "recipient_not_found" }, { status: 404 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (body.honeypot.length > 0) {
    return NextResponse.json({ error: "rejected" }, { status: 400 });
  }

  const { ipHash } = geoFromHeaders(req.headers);
  const limit = await checkRecipientMessage(ipHash, recipient.id);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const ts = await verifyTurnstile(body.turnstileToken ?? null);
  if (!ts.passed) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 400 });
  }

  // Moderate via Claude Haiku (or default-deny if unset).
  const senderEmail = body.email?.trim().toLowerCase() ?? null;
  const moderation = await classifyMessage({
    recipientName: recipient.name,
    recipientRole: `${recipient.role}, ${recipient.organisation}`,
    message: body.message,
    senderName: body.name ?? null,
    senderEmailDomain: senderEmail ? senderEmail.split("@")[1] ?? null : null,
  });

  // Decide initial status + whether to forward.
  const recipientEmail = getRecipientEmail(recipient);
  const canForward = moderation.decision === "forward" && env.resend.enabled && !!recipientEmail;
  let status: "new" | "held" | "rejected" | "forwarded" = "new";
  if (moderation.decision === "reject") status = "rejected";
  else if (moderation.decision === "hold") status = "held";
  else if (canForward) status = "forwarded";
  else status = "held";

  // Encrypt sender email before storing.
  let emailHash: string | null = null;
  let emailCiphertext: string | null = null;
  if (senderEmail) {
    emailHash = hmac(senderEmail);
    emailCiphertext = await encrypt(senderEmail);
  }

  const participantHash = body.participantToken ? hmac(body.participantToken) : null;
  const supabase = getServiceClient();

  // Forward via Resend if all conditions hold.
  let forwardedAt: string | null = null;
  if (status === "forwarded" && recipientEmail) {
    const result = await sendEmail({
      to: recipientEmail,
      replyTo: senderEmail ?? undefined,
      subject: `Resident message via Vision for Winchester: ${shortPreview(body.message)}`,
      text: forwardedBody({
        recipientName: recipient.name,
        senderName: body.name ?? null,
        senderEmail,
        message: body.message,
      }),
    });
    if (result.ok) {
      forwardedAt = new Date().toISOString();
    } else {
      // Forwarding failed at the SMTP level; degrade to held.
      status = "held";
    }
  }

  const { error } = await supabase.from("contact_messages").insert({
    submission_id: null,
    category: `Recipient: ${recipient.name}`,
    name: body.name ? body.name.slice(0, 120) : null,
    email_ciphertext: emailCiphertext,
    email_hash: emailHash,
    message: body.message,
    status,
    ip_hash: ipHash,
    participant_hash: participantHash,
    recipient_id: recipient.id,
    moderation_decision: moderation.decision,
    moderation_reason: moderation.reason,
    forwarded_at: forwardedAt,
  });
  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  await logEvent({
    ipHash,
    participantHash,
    eventType: `recipient_message:${recipient.id}`,
  });

  // Public response: deliberately doesn't reveal moderation outcome to the user.
  // Whether held, forwarded or rejected, they see the same friendly receipt.
  // This avoids signalling how to bypass moderation.
  return NextResponse.json({ ok: true });
}

function shortPreview(s: string): string {
  const first = s.split("\n")[0].trim();
  return first.length <= 60 ? first : first.slice(0, 57) + "…";
}

function forwardedBody(args: {
  recipientName: string;
  senderName: string | null;
  senderEmail: string | null;
  message: string;
}): string {
  const lines: string[] = [];
  lines.push(`A resident has sent you the following message via the Vision for Winchester platform.`);
  lines.push("");
  lines.push("This is a citizen-led, independent review of the Silver Hill / Central Winchester proposals.");
  lines.push("It is not an official Winchester City Council consultation.");
  lines.push("");
  lines.push(`From: ${args.senderName || "(no name given)"}${args.senderEmail ? ` <${args.senderEmail}>` : " (no email given)"}`);
  lines.push("---");
  lines.push(args.message);
  lines.push("---");
  lines.push("");
  lines.push("If the sender provided an email, replying to this message will reach them directly via Reply-To.");
  lines.push("To stop receiving forwarded resident messages, contact the campaign administrator.");
  return lines.join("\n");
}
