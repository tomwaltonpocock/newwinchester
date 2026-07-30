import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const Body = z.object({ stat_key: z.string(), kept: z.boolean() });

export async function PATCH(req: NextRequest) {
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await db().from("stat_prefs").upsert({
    stat_key: body.data.stat_key,
    kept: body.data.kept,
    updated_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
