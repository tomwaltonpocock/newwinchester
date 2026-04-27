import { env } from "./env";

type SendArgs = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  if (!env.resend.enabled) return { ok: false, error: "resend_not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resend.fromEmail,
        to: [args.to],
        subject: args.subject,
        text: args.text,
        reply_to: args.replyTo,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `http_${res.status}_${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
