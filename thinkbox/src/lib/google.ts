import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { db } from "./supabase";
import { encrypt, decrypt } from "./crypto";
import { env } from "./env";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function oauthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    env.googleClientId(),
    env.googleClientSecret(),
    `${env.appUrl()}/api/auth/google/callback`
  );
}

export function authUrl(): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
  });
}

export async function saveTokensFromCode(code: string): Promise<string> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error("No refresh token returned — remove app access at myaccount.google.com/permissions and retry");
  client.setCredentials(tokens);
  const info = await google.oauth2({ version: "v2", auth: client }).userinfo.get();
  const email = info.data.email;
  if (!email) throw new Error("Could not resolve account email");

  await db().from("google_accounts").upsert(
    {
      email,
      refresh_token_enc: encrypt(tokens.refresh_token),
      access_token_enc: tokens.access_token ? encrypt(tokens.access_token) : null,
      access_token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      scopes: GOOGLE_SCOPES,
    },
    { onConflict: "email" }
  );
  return email;
}

export async function getAccount(): Promise<{ email: string; historyId: string | null } | null> {
  const { data } = await db().from("google_accounts").select("email, history_id").limit(1).maybeSingle();
  return data ? { email: data.email, historyId: data.history_id } : null;
}

/** Authorized client for the (single) connected account. */
export async function authedClient(): Promise<{ auth: OAuth2Client; email: string }> {
  const { data, error } = await db().from("google_accounts").select("*").limit(1).maybeSingle();
  if (error || !data) throw new Error("No Google account connected");
  const client = oauthClient();
  client.setCredentials({
    refresh_token: decrypt(data.refresh_token_enc),
    access_token: data.access_token_enc ? decrypt(data.access_token_enc) : undefined,
    expiry_date: data.access_token_expires_at ? new Date(data.access_token_expires_at).getTime() : undefined,
  });
  client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db()
        .from("google_accounts")
        .update({
          access_token_enc: encrypt(tokens.access_token),
          access_token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        })
        .eq("email", data.email);
    }
  });
  return { auth: client, email: data.email };
}
