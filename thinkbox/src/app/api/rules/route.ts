import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const Body = z.object({
  pattern: z.string().min(3).max(200),   // email or @domain
  rule: z.enum(["noise", "never_noise", "signal"]),
  note: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await db().from("sender_rules").upsert({ ...body.data, pattern: body.data.pattern.toLowerCase() });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { pattern } = await req.json().catch(() => ({}));
  if (!pattern) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await db().from("sender_rules").delete().eq("pattern", String(pattern).toLowerCase());
  return NextResponse.json({ ok: true });
}
