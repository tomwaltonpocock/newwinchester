import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase";
import { checkAdminBasicAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ status: z.enum(["approved", "rejected", "pending"]) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authFail = checkAdminBasicAuth(req);
  if (authFail) return authFail;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("uploads")
    .update({ moderation_status: body.status })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });

  await supabase.from("admin_audit_events").insert({
    actor: "basic_auth_admin",
    action: `moderate:${body.status}`,
    target_type: "upload",
    target_id: params.id,
  });

  return NextResponse.json({ ok: true });
}
