import { env } from "./env";
import { encrypt, hmac, randomToken } from "./crypto";
import { getServiceClient } from "./supabase";

export type SubscribeResult = {
  via: "mailchimp" | "local" | "skipped";
  status: string; // "pending" / "subscribed" / "skipped" / etc.
  memberId?: string | null;
  error?: string;
};

/**
 * Add an email to Mailchimp with double opt-in (status: pending). If Mailchimp
 * is not configured, store a row in our local `subscribers` table with a
 * pending status; you can then export and reach out yourself.
 */
export async function subscribeWithDoubleOptIn(
  email: string,
  source?: string
): Promise<SubscribeResult> {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned.includes("@")) return { via: "skipped", status: "invalid", error: "invalid_email" };

  if (env.mailchimp.enabled) {
    return mailchimpSubscribe(cleaned, source);
  }
  return localSubscribe(cleaned, source);
}

async function mailchimpSubscribe(
  email: string,
  source?: string
): Promise<SubscribeResult> {
  const url = `https://${env.mailchimp.serverPrefix}.api.mailchimp.com/3.0/lists/${env.mailchimp.audienceId}/members`;
  const auth = Buffer.from(`anystring:${env.mailchimp.apiKey}`).toString("base64");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        email_address: email,
        status: "pending", // double opt-in
        merge_fields: source ? { SOURCE: source.slice(0, 60) } : undefined,
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) {
      return {
        via: "mailchimp",
        status: (data.status as string) || "pending",
        memberId: (data.id as string) || null,
      };
    }
    // Treat existing-member as a soft success so we don't leak which emails we know about.
    if (res.status === 400 && typeof data.title === "string" && /Member Exists/i.test(data.title)) {
      return { via: "mailchimp", status: "already_member" };
    }
    return {
      via: "mailchimp",
      status: "error",
      error: typeof data.detail === "string" ? data.detail : `http_${res.status}`,
    };
  } catch (e) {
    return { via: "mailchimp", status: "error", error: "fetch_error" };
  }
}

async function localSubscribe(
  email: string,
  source?: string
): Promise<SubscribeResult> {
  try {
    const supabase = getServiceClient();
    const emailHash = hmac(email);
    const ciphertext = await encrypt(email);
    const confirmToken = randomToken(24);
    const { error } = await supabase
      .from("subscribers")
      .upsert(
        {
          email_hash: emailHash,
          email_ciphertext: ciphertext,
          status: "pending",
          source: source ?? null,
          confirm_token: confirmToken,
        },
        { onConflict: "email_hash" }
      );
    if (error) return { via: "local", status: "error", error: error.message };
    return { via: "local", status: "pending" };
  } catch (e) {
    return { via: "local", status: "error", error: (e as Error).message };
  }
}
