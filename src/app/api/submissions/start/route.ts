import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase";
import { hmac, randomToken } from "@/lib/crypto";
import { geoFromHeaders } from "@/lib/geo";
import { checkStart, logEvent } from "@/lib/rate-limit";
import { assertServerEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  participantToken: z.string().min(8).max(200),
  source: z.string().max(60).optional(),
  referrer: z.string().max(500).optional(),
  utm: z.record(z.string().max(100)).optional(),
});

export async function POST(req: NextRequest) {
  assertServerEnv();
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { ipHash, country, region, city, userAgentHash } = geoFromHeaders(req.headers);
  const limit = await checkStart(ipHash);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited", reason: limit.reason }, { status: 429 });
  }

  const participantHash = hmac(body.participantToken);
  const publicToken = randomToken(18);

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      public_token: publicToken,
      source: body.source ?? null,
      referrer: body.referrer ?? null,
      utm: body.utm ?? {},
      user_agent_hash: userAgentHash,
      ip_hash: ipHash,
      participant_hash: participantHash,
      geo_country: country,
      geo_region: region,
      geo_city: city,
    })
    .select("id, public_token")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "db_error", detail: error?.message }, { status: 500 });
  }

  await logEvent({ ipHash, participantHash, eventType: "submission_start" });

  return NextResponse.json({ id: data.id, public_token: data.public_token });
}
