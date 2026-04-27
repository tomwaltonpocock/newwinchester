import { getServiceClient } from "@/lib/supabase";
import { imagePairs } from "@/content/imagePairs";
import { missingInfoOptions } from "@/content/missingInfoOptions";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const supabase = getServiceClient();
  const { data: subs } = await supabase
    .from("submissions")
    .select("id, validation_category, postcode_status, general_comment, consent_public_summary, missing_info, missing_info_comment, overall_old_rating, overall_current_rating, overall_refined_rating")
    .not("completed_at", "is", null);

  const total = subs?.length ?? 0;
  const validation = { low: 0, plausible: 0, higher: 0 } as Record<string, number>;
  const postcode: Record<string, number> = {};
  const missingCounts: Record<string, number> = {};

  let oldSum = 0, oldN = 0, curSum = 0, curN = 0, refSum = 0, refN = 0;

  for (const r of subs ?? []) {
    if (r.validation_category) validation[r.validation_category as string]++;
    const pc = (r.postcode_status as string) || "invalid_or_missing";
    postcode[pc] = (postcode[pc] ?? 0) + 1;
    for (const m of (r.missing_info as string[]) ?? []) {
      missingCounts[m] = (missingCounts[m] ?? 0) + 1;
    }
    if (typeof r.overall_old_rating === "number") { oldSum += r.overall_old_rating; oldN++; }
    if (typeof r.overall_current_rating === "number") { curSum += r.overall_current_rating; curN++; }
    if (typeof r.overall_refined_rating === "number") { refSum += r.overall_refined_rating; refN++; }
  }

  const validatedIds = new Set(
    (subs ?? []).filter((s) => s.validation_category === "plausible" || s.validation_category === "higher").map((s) => s.id)
  );

  const { data: pairs } = await supabase
    .from("pair_responses")
    .select("submission_id, image_pair_id, preference");

  const pairSummaries = imagePairs.map((p) => {
    const rows = (pairs ?? []).filter((r) => r.image_pair_id === p.id && validatedIds.has(r.submission_id));
    const tot = rows.length;
    const dev = rows.filter((r) => r.preference === "developer").length;
    const ref = rows.filter((r) => r.preference === "refined").length;
    const np = rows.filter((r) => r.preference === "no_preference").length;
    return {
      id: p.id,
      title: p.title,
      total: tot,
      developerPct: tot ? Math.round((dev / tot) * 100) : 0,
      refinedPct: tot ? Math.round((ref / tot) * 100) : 0,
      noPrefPct: tot ? Math.round((np / tot) * 100) : 0,
    };
  });

  const quotes = (subs ?? [])
    .filter((s) => s.consent_public_summary && s.general_comment && s.general_comment.trim().length > 20)
    .slice(0, 8)
    .map((s) => s.general_comment as string);

  const topMissing = Object.entries(missingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <article className="max-w-prose2">
      <p className="text-xs uppercase tracking-widest text-stone-600 no-print">Public-style report</p>
      <h1 className="font-serif">Vision for Winchester — public summary</h1>
      <p className="mt-3 text-sm text-stone-700">
        {total} completed responses. Validation breakdown: higher confidence {validation.higher},
        plausible {validation.plausible}, low confidence {validation.low}.
      </p>

      <h2 className="font-serif mt-6">Overall ratings (mean, where given)</h2>
      <ul className="mt-2 text-sm">
        <li>Older approach: {oldN ? (oldSum / oldN).toFixed(2) : "—"} (n={oldN})</li>
        <li>Current developer direction: {curN ? (curSum / curN).toFixed(2) : "—"} (n={curN})</li>
        <li>Citizen-refined direction: {refN ? (refSum / refN).toFixed(2) : "—"} (n={refN})</li>
      </ul>

      <h2 className="font-serif mt-6">Pair-by-pair preference (validated only)</h2>
      <ul className="mt-2 text-sm space-y-1">
        {pairSummaries.map((p) => (
          <li key={p.id}>
            <strong>{p.title}</strong>: refined {p.refinedPct}% · developer {p.developerPct}% ·
            no preference {p.noPrefPct}% (n={p.total})
          </li>
        ))}
      </ul>

      <h2 className="font-serif mt-6">Top missing-information requests</h2>
      <ol className="mt-2 text-sm list-decimal pl-5 space-y-1">
        {topMissing.map(([m, n]) => (
          <li key={m}>{m} — {n}</li>
        ))}
      </ol>

      {quotes.length > 0 && (
        <>
          <h2 className="font-serif mt-6">Selected resident comments</h2>
          <p className="text-xs text-stone-600">Only included where the resident gave consent for public summaries.</p>
          <ul className="mt-2 text-sm space-y-3">
            {quotes.map((q, i) => (
              <li key={i} className="border-l-2 border-stone-200 pl-3">{q}</li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-10 text-xs text-stone-600">
        This page is designed to print cleanly. Use your browser’s print dialog to produce a PDF.
      </p>
    </article>
  );
}
