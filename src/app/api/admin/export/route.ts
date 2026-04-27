import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkAdminBasicAuth } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["submissions", "aspects", "comments", "missing", "council"]);

export async function GET(req: NextRequest) {
  const authFail = checkAdminBasicAuth(req);
  if (authFail) return authFail;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "submissions";
  if (!TYPES.has(type)) {
    return new Response("unknown export type", { status: 400 });
  }

  const supabase = getServiceClient();
  let csv = "";

  if (type === "submissions") {
    const { data } = await supabase.from("submissions").select("*").order("created_at", { ascending: false });
    csv = toCsv(data ?? []);
  } else if (type === "aspects") {
    const { data } = await supabase.from("aspect_responses").select("*").order("created_at", { ascending: false });
    csv = toCsv(data ?? []);
  } else if (type === "comments") {
    const { data } = await supabase
      .from("submissions")
      .select("id, created_at, validation_category, postcode_status, general_comment, missing_info_comment, consent_public_summary")
      .or("general_comment.not.is.null,missing_info_comment.not.is.null")
      .order("created_at", { ascending: false });
    csv = toCsv(data ?? []);
  } else if (type === "missing") {
    const { data } = await supabase
      .from("submissions")
      .select("id, created_at, validation_category, postcode_status, missing_info, missing_info_comment")
      .order("created_at", { ascending: false });
    csv = toCsv(data ?? []);
  } else if (type === "council") {
    // Council summary export: strip raw email hash, IP hash, participant hash, UA hash.
    const { data } = await supabase
      .from("submissions")
      .select(
        "id, public_token, created_at, completed_at, source, postcode_outward, postcode_status, geo_country, geo_region, validation_score, validation_category, missing_info, missing_info_comment, general_comment, consent_share_council, consent_public_summary"
      )
      .eq("consent_share_council", true)
      .order("created_at", { ascending: false });
    csv = toCsv(data ?? []);
  }

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vfw-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
