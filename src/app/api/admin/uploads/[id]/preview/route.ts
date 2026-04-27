import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkAdminBasicAuth } from "@/lib/auth";
import { signedUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authFail = checkAdminBasicAuth(req);
  if (authFail) return authFail;
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("object_key")
    .eq("id", params.id)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const url = await signedUrl(data.object_key, 60 * 5);
  if (!url) return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  return NextResponse.redirect(url);
}
