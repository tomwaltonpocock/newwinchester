import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.anthropicKey() });
  return client;
}

/** One-shot call that must return JSON matching the caller's expectations. */
export async function jsonCall<T>(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const res = await anthropic().messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 2000,
    system: opts.system + "\n\nRespond with ONLY valid JSON. No prose, no code fences.",
    messages: [{ role: "user", content: opts.user }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}

export async function textCall(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await anthropic().messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 2000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
