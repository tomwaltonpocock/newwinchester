import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { sha256, randomToken } from "@/lib/crypto";
import { uploadObject } from "@/lib/storage";
import { assertServerEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB hard cap server-side

export async function POST(req: NextRequest) {
  assertServerEnv();
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_form" }, { status: 400 });

  const publicToken = String(form.get("publicToken") || "");
  const consentShare = form.get("consentShare") === "true";
  const file = form.get("file");
  if (!publicToken || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const supabase = getServiceClient();
  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .select("id, public_token")
    .eq("public_token", publicToken)
    .maybeSingle();
  if (subErr || !sub) {
    return NextResponse.json({ error: "submission_not_found" }, { status: 404 });
  }

  // Enforce per-submission upload cap.
  const { count } = await supabase
    .from("uploads")
    .select("id", { count: "exact", head: true })
    .eq("submission_id", sub.id);
  if ((count ?? 0) >= 2) {
    return NextResponse.json({ error: "upload_limit_reached" }, { status: 409 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const digest = sha256(buf);
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectKey = `uploads/${sub.id}/${randomToken(8)}.${ext}`;

  const upload = await uploadObject(objectKey, buf, file.type);
  if (!upload.ok) {
    return NextResponse.json({ error: "storage_error", detail: upload.error }, { status: 500 });
  }

  const { error: insertErr } = await supabase.from("uploads").insert({
    submission_id: sub.id,
    object_key: objectKey,
    original_name: typeof file.name === "string" ? file.name.slice(0, 200) : null,
    mime_type: file.type,
    size_bytes: file.size,
    sha256: digest,
    consent_share: consentShare,
    moderation_status: "pending",
  });
  if (insertErr) {
    return NextResponse.json({ error: "db_error", detail: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
