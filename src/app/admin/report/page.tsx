import { getServiceClient } from "@/lib/supabase";
import { aspects } from "@/content/aspects";

export const dynamic = "force-dynamic";

type AspectRow = {
  submission_id: string;
  aspect_n: number;
  star_developer: number | null;
  star_alt_1: number | null;
  star_alt_2: number | null;
  star_alt_3: number | null;
};

function meanOrNull(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((s, n) => s + n, 0) / xs.length;
}

export default async function ReportPage() {
  const supabase = getServiceClient();
  const { data: subs } = await supabase
    .from("submissions")
    .select("id, validation_category, postcode_status, general_comment, consent_public_summary, missing_info, missing_info_comment")
    .not("completed_at", "is", null);

  const total = subs?.length ?? 0;
  const validation = { low: 0, plausible: 0, higher: 0 } as Record<string, number>;
  const postcode: Record<string, number> = {};
  const missingCounts: Record<string, number> = {};

  for (const r of subs ?? []) {
    if (r.validation_category) validation[r.validation_category as string]++;
    const pc = (r.postcode_status as string) || "invalid_or_missing";
    postcode[pc] = (postcode[pc] ?? 0) + 1;
    for (const m of (r.missing_info as string[]) ?? []) {
      missingCounts[m] = (missingCounts[m] ?? 0) + 1;
    }
  }

  const validatedIds = new Set(
    (subs ?? [])
      .filter((s) => s.validation_category === "plausible" || s.validation_category === "higher")
      .map((s) => s.id)
  );

  const { data: rowsRaw } = await supabase
    .from("aspect_responses")
    .select("submission_id, aspect_n, star_developer, star_alt_1, star_alt_2, star_alt_3");
  const rows = (rowsRaw ?? []) as AspectRow[];
  const validatedRows = rows.filter((r) => validatedIds.has(r.submission_id));

  const aspectSummaries = aspects.map((a) => {
    const aRows = validatedRows.filter((r) => r.aspect_n === a.n);
    const dev = aRows.map((r) => r.star_developer).filter((n): n is number => n != null);
    const alt1 = aRows.map((r) => r.star_alt_1).filter((n): n is number => n != null);
    const alt2 = aRows.map((r) => r.star_alt_2).filter((n): n is number => n != null);
    const alt3 = aRows.map((r) => r.star_alt_3).filter((n): n is number => n != null);
    return {
      n: a.n,
      title: a.title,
      total: aRows.length,
      meanDev: meanOrNull(dev),
      meanAlt1: a.altIndices.includes(1) ? meanOrNull(alt1) : null,
      meanAlt2: a.altIndices.includes(2) ? meanOrNull(alt2) : null,
      meanAlt3: a.altIndices.includes(3) ? meanOrNull(alt3) : null,
      altIndices: a.altIndices,
    };
  });

  const quotes = (subs ?? [])
    .filter((s) => s.consent_public_summary && s.general_comment && s.general_comment.trim().length > 20)
    .slice(0, 8)
    .map((s) => s.general_comment as string);

  const topMissing = Object.entries(missingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(2));

  return (
    <article className="max-w-prose2">
      <p className="text-xs uppercase tracking-widest text-stone-600 no-print">Public-style report</p>
      <h1 className="font-serif">Vision for Winchester — public summary</h1>
      <p className="mt-3 text-sm text-stone-700">
        {total} completed responses. Validation breakdown: higher confidence {validation.higher},
        plausible {validation.plausible}, low confidence {validation.low}.
      </p>

      <h2 className="font-serif mt-6">Aspect ratings (validated only, mean of 1–5)</h2>
      <ul className="mt-2 text-sm space-y-1">
        {aspectSummaries.map((a) => (
          <li key={a.n}>
            <strong>Aspect {a.n} — {a.title}</strong>:
            {" "}current {fmt(a.meanDev)}
            {a.altIndices.includes(1) && ` · alt 1 ${fmt(a.meanAlt1)}`}
            {a.altIndices.includes(2) && ` · alt 2 ${fmt(a.meanAlt2)}`}
            {a.altIndices.includes(3) && ` · alt 3 ${fmt(a.meanAlt3)}`}
            {" "}(n={a.total})
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
