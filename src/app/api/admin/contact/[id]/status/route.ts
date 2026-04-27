import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase";
import { checkAdminBasicAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ status: z.enum(["new", "needs_reply", "replied", "archived"]) });

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
  const { error } = await supabase.from("contact_messages").update({ status: body.status }).eq("id", params.id);
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });

  await supabase.from("admin_audit_events").insert({
    actor: "basic_auth_admin",
    action: `contact_status:${body.status}`,
    target_type: "contact_message",
    target_id: params.id,
  });
  return NextResponse.json({ ok: true });
}
