import { google, gmail_v1 } from "googleapis";
import { authedClient } from "./google";

export type ParsedMessage = {
  id: string;
  threadId: string;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  cc: { name: string; email: string }[];
  subject: string;
  date: Date;
  snippet: string;
  bodyText: string;
  labelIds: string[];
  listUnsubscribe: boolean;
  messageIdHeader: string | null;
  referencesHeader: string | null;
};

export async function gmail(): Promise<{ api: gmail_v1.Gmail; email: string }> {
  const { auth, email } = await authedClient();
  return { api: google.gmail({ version: "v1", auth }), email };
}

export function parseAddress(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/);
  if (m) return { name: (m[1] ?? "").trim(), email: m[2].trim().toLowerCase() };
  return { name: "", email: raw.trim().toLowerCase() };
}

export function parseAddressList(raw: string | undefined): { name: string; email: string }[] {
  if (!raw) return [];
  // split on commas not inside quotes
  const parts = raw.match(/(?:[^,"]|"[^"]*")+/g) ?? [];
  return parts.map((p) => parseAddress(p)).filter((a) => a.email.includes("@"));
}

function header(msg: gmail_v1.Schema$Message, name: string): string | undefined {
  return msg.payload?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined;
}

function decodeB64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

/** Walk MIME parts, prefer text/plain, fall back to stripped text/html. */
export function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";
  const stack: gmail_v1.Schema$MessagePart[] = [payload];
  let plain = "";
  let html = "";
  while (stack.length) {
    const part = stack.pop()!;
    if (part.parts) stack.push(...part.parts);
    const data = part.body?.data;
    if (!data) continue;
    if (part.mimeType === "text/plain" && !plain) plain = decodeB64Url(data);
    if (part.mimeType === "text/html" && !html) html = decodeB64Url(data);
  }
  if (plain) return plain.trim();
  if (html) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return "";
}

export function parseMessage(msg: gmail_v1.Schema$Message): ParsedMessage {
  const dateHeader = header(msg, "Date");
  return {
    id: msg.id!,
    threadId: msg.threadId!,
    from: parseAddress(header(msg, "From") ?? ""),
    to: parseAddressList(header(msg, "To")),
    cc: parseAddressList(header(msg, "Cc")),
    subject: header(msg, "Subject") ?? "(no subject)",
    date: msg.internalDate ? new Date(Number(msg.internalDate)) : dateHeader ? new Date(dateHeader) : new Date(),
    snippet: msg.snippet ?? "",
    bodyText: extractBody(msg.payload).slice(0, 20000),
    labelIds: msg.labelIds ?? [],
    listUnsubscribe: !!header(msg, "List-Unsubscribe"),
    messageIdHeader: header(msg, "Message-ID") ?? null,
    referencesHeader: header(msg, "References") ?? null,
  };
}

/** List recent inbox messages (full sync path). */
export async function listInboxMessages(opts: { maxResults?: number; q?: string }): Promise<ParsedMessage[]> {
  const { api } = await gmail();
  const list = await api.users.messages.list({
    userId: "me",
    labelIds: ["INBOX"],
    maxResults: opts.maxResults ?? 50,
    q: opts.q,
  });
  const ids = list.data.messages ?? [];
  const out: ParsedMessage[] = [];
  for (const m of ids) {
    const full = await api.users.messages.get({ userId: "me", id: m.id!, format: "full" });
    out.push(parseMessage(full.data));
  }
  return out;
}

/** Fetch sent messages (for voice profile + relationship history). */
export async function listSentMessages(maxResults: number, q?: string): Promise<ParsedMessage[]> {
  const { api } = await gmail();
  const list = await api.users.messages.list({ userId: "me", labelIds: ["SENT"], maxResults, q });
  const out: ParsedMessage[] = [];
  for (const m of list.data.messages ?? []) {
    const full = await api.users.messages.get({ userId: "me", id: m.id!, format: "full" });
    out.push(parseMessage(full.data));
  }
  return out;
}

export async function getThreadMessages(threadId: string): Promise<ParsedMessage[]> {
  const { api } = await gmail();
  const t = await api.users.threads.get({ userId: "me", id: threadId, format: "full" });
  return (t.data.messages ?? []).map(parseMessage);
}

/** Get-or-create a Thinkbox label, returns label id. */
export async function ensureLabel(name: string): Promise<string> {
  const { api } = await gmail();
  const labels = await api.users.labels.list({ userId: "me" });
  const found = labels.data.labels?.find((l) => l.name === name);
  if (found?.id) return found.id;
  const created = await api.users.labels.create({
    userId: "me",
    requestBody: { name, labelListVisibility: "labelShow", messageListVisibility: "show" },
  });
  return created.data.id!;
}

export async function labelMessage(messageId: string, addLabelIds: string[], removeLabelIds: string[] = []) {
  const { api } = await gmail();
  await api.users.messages.modify({ userId: "me", id: messageId, requestBody: { addLabelIds, removeLabelIds } });
}

function buildMime(opts: {
  fromEmail: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string | null;
}): string {
  const lines = [
    `From: ${opts.fromEmail}`,
    `To: ${opts.to}`,
    ...(opts.cc ? [`Cc: ${opts.cc}`] : []),
    `Subject: ${opts.subject}`,
    ...(opts.inReplyTo ? [`In-Reply-To: ${opts.inReplyTo}`] : []),
    ...(opts.references ? [`References: ${opts.references}`] : []),
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
    "",
    opts.body,
  ];
  return Buffer.from(lines.join("\r\n")).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createGmailDraft(opts: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string | null;
  references?: string | null;
}): Promise<string> {
  const { api, email } = await gmail();
  const raw = buildMime({ fromEmail: email, ...opts });
  const res = await api.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw, threadId: opts.threadId } },
  });
  return res.data.id!;
}

export async function sendMessage(opts: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string | null;
  references?: string | null;
}): Promise<string> {
  const { api, email } = await gmail();
  const raw = buildMime({ fromEmail: email, ...opts });
  const res = await api.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId: opts.threadId },
  });
  return res.data.id!;
}
