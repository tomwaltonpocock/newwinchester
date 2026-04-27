/**
 * Tiny moderator using Claude Haiku 4.5 to classify messages addressed to
 * named local decision-makers. Three outcomes:
 *
 *   forward — genuine constructive feedback related to the development.
 *   hold    — borderline / off-topic / bot-ish — admin reviews manually.
 *   reject  — threats, harassment, slurs, scams, doxing, malware.
 *
 * If ANTHROPIC_API_KEY is absent, every message is held (default-deny).
 * If the API errors, we hold the message — never auto-forward without
 * a clean classification.
 */

export type ModerationDecision = "forward" | "hold" | "reject";

export type ModerationResult = {
  decision: ModerationDecision;
  reason: string;
};

const MODEL = "claude-haiku-4-5";

const SYSTEM = `You moderate messages residents send to named local public figures via a citizen-led civic-feedback platform about a city-centre development (Silver Hill, Winchester).

Decide which of three buckets the message belongs in:
- "forward" — genuine constructive opinion, polite criticism, question, or offer of help related to planning, design, the development, or local civic interest. Includes strongly worded but civil feedback.
- "hold" — borderline aggressive, off-topic, bot-like, spam-ish, unrelated, or impossible to verify as a real planning concern. Hold it for admin review.
- "reject" — threats, harassment, slurs, attacks on the person rather than the proposal, scams, doxing, links to malware/phishing, sexual content, or anything that could plausibly be defamatory or unlawful.

Respond with JSON only, no prose: {"decision":"forward"|"hold"|"reject","reason":"<5 to 15 words>"}`;

export async function classifyMessage(args: {
  recipientName: string;
  recipientRole: string;
  message: string;
  senderName?: string | null;
  senderEmailDomain?: string | null;
}): Promise<ModerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { decision: "hold", reason: "moderator_not_configured" };
  }

  const userPrompt = `Recipient: ${args.recipientName} — ${args.recipientRole}
Sender name: ${args.senderName || "(none)"}
Sender email domain: ${args.senderEmailDomain || "(none)"}

Message:
"""
${args.message.slice(0, 4000)}
"""`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 80,
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      return { decision: "hold", reason: `moderator_http_${res.status}` };
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = parseJson(text);
    if (parsed && (parsed.decision === "forward" || parsed.decision === "hold" || parsed.decision === "reject")) {
      return {
        decision: parsed.decision,
        reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 120) : "",
      };
    }
    return { decision: "hold", reason: "moderator_unparsed" };
  } catch (e) {
    return { decision: "hold", reason: "moderator_error" };
  }
}

function parseJson(text: string): { decision?: string; reason?: string } | null {
  // Be tolerant of stray whitespace, trailing prose etc.
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}
