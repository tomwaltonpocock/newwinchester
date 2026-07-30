import { db } from "./supabase";
import { textCall } from "./claude";
import { env } from "./env";
import { listSentMessages, ParsedMessage } from "./gmail";

/**
 * Distill an authorial-voice style guide from the owner's actual sent mail.
 * Stored once, refreshed on demand; injected into every drafting prompt.
 */
export async function buildVoiceProfile(): Promise<{ profile: string; samples: number }> {
  const sent = await listSentMessages(60, "-category:promotions");
  // keep human-to-human, reasonably sized bodies; strip quoted trails
  const samples = sent
    .map((m) => stripQuoted(m.bodyText))
    .filter((b) => b.length > 40 && b.length < 3000)
    .slice(0, 40);

  const profile = await textCall({
    model: env.draftingModel(),
    system: `You are a forensic stylist. From these emails written by one person, produce a compact style guide (≤400 words) that would let a ghostwriter be indistinguishable from them. Cover: greeting habits (per formality level), sign-offs, typical length, sentence rhythm, punctuation quirks, vocabulary register, how they say yes / no / maybe, how they hedge, humour, how they open cold vs warm messages, formatting habits (paragraphs vs one-liners). Quote short verbatim phrases they actually reuse. Be concrete, not flattering.`,
    user: samples.map((s, i) => `--- EMAIL ${i + 1} ---\n${s}`).join("\n\n"),
    maxTokens: 900,
  });

  await db().from("voice_profile").upsert({ id: 1, profile, samples_analyzed: samples.length, built_at: new Date().toISOString() });
  return { profile, samples: samples.length };
}

export function stripQuoted(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) break;
    if (/^On .+wrote:\s*$/.test(line.trim())) break;
    if (/^-{2,}\s*Original Message/i.test(line.trim())) break;
    if (/^From:\s.+$/i.test(line.trim()) && out.length > 0) break;
    out.push(line);
  }
  return out.join("\n").trim();
}

export async function getVoiceProfile(): Promise<string | null> {
  const { data } = await db().from("voice_profile").select("profile").eq("id", 1).maybeSingle();
  return data?.profile ?? null;
}

const ANTI_TELL_RULES = `Hard rules — the reply must not read as AI-written:
- Never open with "I hope this email finds you well" or any variant.
- No "I'd be happy to", "Certainly!", "Great question", "delve", "leverage", "streamline", "I appreciate you reaching out".
- No bullet lists or headers unless this writer uses them (see style guide).
- Do not restate their email back at them. Do not summarise before answering.
- Vary sentence length; allow minor informality where the writer does.
- No em-dash chains, no triadic "clear, concise, and compelling" constructions.
- Match the writer's actual greeting and sign-off habits for this formality level.
- Shorter is better. If the writer would send two lines, send two lines.`;

export async function draftReply(opts: {
  threadContext: ParsedMessage[];   // oldest → newest
  ownerEmail: string;
  decisionTitle: string;
  direction?: string;               // optional user steer, e.g. "decline politely"
  slotsText?: string;               // for scheduling replies
  travelNote?: string;
}): Promise<{ subject: string; body: string }> {
  const profile = (await getVoiceProfile()) ?? "No profile yet: default to brief, warm, plain British English.";
  const thread = opts.threadContext
    .slice(-6)
    .map((m) => `From: ${m.from.name || m.from.email}\nDate: ${m.date.toISOString()}\n\n${stripQuoted(m.bodyText).slice(0, 2500)}`)
    .join("\n\n=== earlier message above, later below ===\n\n");

  const body = await textCall({
    model: env.draftingModel(),
    system: `You ghostwrite email replies for the owner of this inbox (${opts.ownerEmail}). Write ONLY the reply body (no subject line, no commentary), exactly as they would write it.\n\nTHEIR STYLE GUIDE:\n${profile}\n\n${ANTI_TELL_RULES}`,
    user: [
      `Decision being answered: ${opts.decisionTitle}`,
      opts.direction ? `The owner's steer: ${opts.direction}` : null,
      opts.slotsText ? `Times the owner selected to offer (use these, phrase naturally):\n${opts.slotsText}` : null,
      opts.travelNote ? `Travel context to respect: ${opts.travelNote}` : null,
      `THREAD (oldest first):\n${thread}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    maxTokens: 800,
  });

  const lastSubject = opts.threadContext.at(-1)?.subject ?? "";
  const subject = lastSubject.toLowerCase().startsWith("re:") ? lastSubject : `Re: ${lastSubject}`;
  return { subject, body };
}
