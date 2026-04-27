import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase";
import { assertServerEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ publicToken: z.string().min(8) });

export async function POST(req: NextRequest) {
  assertServerEnv();
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("submissions")
    .update({ mailto_clicked_at: new Date().toISOString() })
    .eq("public_token", body.publicToken);
  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
