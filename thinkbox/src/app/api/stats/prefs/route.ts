import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const Body = z.object({ stat_key: z.string(), kept: z.boolean() });

export async function PATCH(req: NextRequest) {
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  await sql`
    insert into stat_prefs (stat_key, kept, updated_at) values (${body.data.stat_key}, ${body.data.kept}, now())
    on conflict (stat_key) do update set kept = excluded.kept, updated_at = now()`;
  return NextResponse.json({ ok: true });
}
