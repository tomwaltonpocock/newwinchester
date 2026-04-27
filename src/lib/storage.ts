import { env } from "./env";
import { getServiceClient } from "./supabase";

/**
 * Wrappers around Supabase Storage. The bucket is private; admin previews
 * use signed URLs.
 */

export async function uploadObject(
  key: string,
  data: ArrayBuffer | Uint8Array | Buffer,
  contentType: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServiceClient();
  const { error } = await supabase.storage.from(env.supabase.bucket).upload(key, data, {
    contentType,
    cacheControl: "private, max-age=0, no-store",
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signedUrl(key: string, expiresInSeconds = 60 * 5): Promise<string | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(env.supabase.bucket)
    .createSignedUrl(key, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteObject(key: string): Promise<void> {
  const supabase = getServiceClient();
  await supabase.storage.from(env.supabase.bucket).remove([key]);
}
