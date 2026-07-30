import { jsonCall } from "./claude";
import { env } from "./env";
import type { ParsedMessage } from "./gmail";

export type TriageResult = {
  category: "decision" | "fyi" | "noise" | "signal_noise" | "scheduling";
  magnitude: number;            // 1..5
  decision_title: string | null;
  decision_summary: string | null;
  options: string[];
  kind: "reply" | "scheduling" | "task" | "fyi_ack" | null;
  needs_reply_by: string | null; // ISO date if a deadline is stated/implied
  signal_note: string | null;    // for signal_noise, e.g. "X viewed your deck on DocSend"
  noise_reason: string | null;
};

const TRIAGE_SYSTEM = `You triage the personal inbox of a busy investor/advisor. For each email you decide what it IS at a level of abstraction above email:

- "decision": the owner must decide or act — a real ask, an intro to accept/decline, terms to agree, a document to approve, a question only they can answer.
- "scheduling": the core ask is finding a time to meet/call.
- "fyi": legitimately from a human or system the owner cares about, but nothing to decide (confirmations, receipts they should be able to find, updates).
- "signal_noise": automated, but carries a signal worth surfacing as one line (DocSend/deck view alerts, data-room access, signature completed, payment received).
- "noise": newsletters, cold outreach with no relevance, marketing, notifications with no signal.

Magnitude (1-5) for decisions/scheduling: weigh money at stake, irreversibility, relationship importance, time-sensitivity. 5 = major (term sheet, key hire, significant capital). 1 = trivial.

decision_title: ≤12 words, phrased as the decision itself ("Agree to intro Sarah → Acme CEO?"), not a subject line.
decision_summary: 1-3 short sentences of essential context.
options: 0-3 plausible responses, each ≤8 words.
kind: reply | scheduling | task | fyi_ack.
needs_reply_by: ISO date only if the email states or clearly implies a deadline, else null.`;

export async function triageMessage(msg: ParsedMessage, ownerEmail: string): Promise<TriageResult> {
  const user = JSON.stringify({
    owner: ownerEmail,
    from: msg.from,
    to: msg.to.map((t) => t.email),
    cc: msg.cc.map((t) => t.email),
    subject: msg.subject,
    date: msg.date.toISOString(),
    has_list_unsubscribe: msg.listUnsubscribe,
    body: msg.bodyText.slice(0, 6000),
  });
  return jsonCall<TriageResult>({
    model: env.triageModel(),
    system:
      TRIAGE_SYSTEM +
      `\n\nReturn JSON: {"category":"...","magnitude":1-5,"decision_title":str|null,"decision_summary":str|null,"options":[str],"kind":str|null,"needs_reply_by":str|null,"signal_note":str|null,"noise_reason":str|null}`,
    user,
    maxTokens: 700,
  });
}

export type ToneResult = { tone_score: number; tone_summary: string };

export async function analyzeTone(contactEmail: string, excerpts: string[]): Promise<ToneResult> {
  return jsonCall<ToneResult>({
    model: env.triageModel(),
    system: `You assess the warmth of an email relationship from message excerpts. Return JSON {"tone_score": -1..1, "tone_summary": "≤15 words"}. 1 = genuinely warm/personal, 0 = neutral/professional, -1 = strained/cold. Judge the human tone, not the topic.`,
    user: JSON.stringify({ contact: contactEmail, excerpts: excerpts.slice(0, 6).map((e) => e.slice(0, 800)) }),
    maxTokens: 200,
  });
}
