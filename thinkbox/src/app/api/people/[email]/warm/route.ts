import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAccount } from "@/lib/google";
import { listSentMessages, createGmailDraft } from "@/lib/gmail";
import { getVoiceProfile, stripQuoted } from "@/lib/voice";
import { textCall } from "@/lib/claude";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Draft a keep-warm note to a contact, grounded in real history. */
export async function POST(req: NextRequest, { params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email).toLowerCase();
  const account = await getAccount();
  if (!account) return NextResponse.json({ error: "not connected" }, { status: 400 });
  const rows = await sql`select * from contacts where email = ${email}`;
  const c = rows[0];
  if (!c) return NextResponse.json({ error: "unknown contact" }, { status: 404 });

  const { direction } = await req.json().catch(() => ({ direction: undefined as string | undefined }));
  const history = await listSentMessages(6, `to:${email} OR from:${email}`);
  const excerpts = history.map((m) => `(${m.date.toISOString().slice(0, 10)}) ${stripQuoted(m.bodyText).slice(0, 1200)}`);
  const profile = (await getVoiceProfile()) ?? "Brief, warm, plain British English.";

  const body = await textCall({
    model: env.draftingModel(),
    system: `You ghostwrite a short keep-in-touch email for the inbox owner. It must feel personal and specific, never like a "circling back" template. Reference something real from the history if there is one. 2-5 sentences. Write ONLY the email body.\n\nSTYLE GUIDE:\n${profile}\n\nNever use: "circling back", "touching base", "hope you're well", "it's been a while, I know". No AI-sounding polish.`,
    user: [
      `Contact: ${c.name || email} <${email}>`,
      `Last contact: ${
        [c.last_inbound_at, c.last_outbound_at]
          .filter(Boolean)
          .map((x: unknown) => new Date(x as string).toISOString())
          .sort()
          .at(-1) ?? "unknown"
      }`,
      c.notes ? `Owner's notes on them: ${c.notes}` : null,
      direction ? `Owner's steer: ${direction}` : null,
      `Recent exchanges:\n${excerpts.join("\n---\n") || "(none available)"}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    maxTokens: 500,
  });

  const subject = await textCall({
    model: env.triageModel(),
    system: `Write a natural, specific email subject line (≤6 words) for this note. Not "Checking in". Return only the subject.`,
    user: body,
    maxTokens: 30,
  });

  const gmailDraftId = await createGmailDraft({ to: email, subject, body });
  return NextResponse.json({ ok: true, subject, body, gmailDraftId });
}
