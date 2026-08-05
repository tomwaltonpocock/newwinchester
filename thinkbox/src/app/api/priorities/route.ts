import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const Post = z.object({ content: z.string().min(2).max(500), period: z.enum(["week", "month"]).default("week") });

export async function POST(req: NextRequest) {
  const body = Post.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await sql`insert into priorities (content, period) values (${body.data.content}, ${body.data.period})`;
  return NextResponse.json({ ok: true });
}

const Del = z.object({ id: z.string().uuid() });

export async function DELETE(req: NextRequest) {
  const body = Del.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await sql`update priorities set active = false where id = ${body.data.id}`;
  return NextResponse.json({ ok: true });
}
