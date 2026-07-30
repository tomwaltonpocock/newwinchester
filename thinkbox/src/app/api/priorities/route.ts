import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const Post = z.object({ content: z.string().min(2).max(500), period: z.enum(["week", "month"]).default("week") });

export async function POST(req: NextRequest) {
  const body = Post.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await db().from("priorities").insert({ content: body.data.content, period: body.data.period });
  return NextResponse.json({ ok: true });
}

const Del = z.object({ id: z.string().uuid() });

export async function DELETE(req: NextRequest) {
  const body = Del.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await db().from("priorities").update({ active: false }).eq("id", body.data.id);
  return NextResponse.json({ ok: true });
}
