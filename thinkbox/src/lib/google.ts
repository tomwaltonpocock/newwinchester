import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { sql } from "./db";
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

  const refreshEnc = encrypt(tokens.refresh_token);
  const accessEnc = tokens.access_token ? encrypt(tokens.access_token) : null;
  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;
  await sql`
    insert into google_accounts (email, refresh_token_enc, access_token_enc, access_token_expires_at, scopes)
    values (${email}, ${refreshEnc}, ${accessEnc}, ${expiresAt}, ${GOOGLE_SCOPES})
    on conflict (email) do update set
      refresh_token_enc = excluded.refresh_token_enc,
      access_token_enc = excluded.access_token_enc,
      access_token_expires_at = excluded.access_token_expires_at,
      scopes = excluded.scopes`;
  return email;
}

export async function getAccount(): Promise<{ email: string; historyId: string | null } | null> {
  const rows = await sql`select email, history_id from google_accounts limit 1`;
  return rows.length ? { email: rows[0].email, historyId: rows[0].history_id } : null;
}

/** Authorized client for the (single) connected account. */
export async function authedClient(): Promise<{ auth: OAuth2Client; email: string }> {
  const rows = await sql`select * from google_accounts limit 1`;
  if (!rows.length) throw new Error("No Google account connected");
  const data = rows[0];
  const client = oauthClient();
  client.setCredentials({
    refresh_token: decrypt(data.refresh_token_enc),
    access_token: data.access_token_enc ? decrypt(data.access_token_enc) : undefined,
    expiry_date: data.access_token_expires_at ? new Date(data.access_token_expires_at).getTime() : undefined,
  });
  client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      const enc = encrypt(tokens.access_token);
      const exp = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;
      await sql`update google_accounts set access_token_enc = ${enc}, access_token_expires_at = ${exp} where email = ${data.email}`;
    }
  });
  return { auth: client, email: data.email };
}
