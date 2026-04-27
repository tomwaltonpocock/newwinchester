import { getServiceClient } from "@/lib/supabase";
import { imagePairs } from "@/content/imagePairs";

export const dynamic = "force-dynamic";

type Search = { validatedOnly?: string };

export default async function PairsPage({ searchParams }: { searchParams: Search }) {
  const validatedOnly = searchParams.validatedOnly === "true";

  const supabase = getServiceClient();

  // Query pair responses, optionally joining to submissions.validation_category for filter.
  const { data: subs } = await supabase
    .from("submissions")
    .select("id, validation_category")
    .not("completed_at", "is", null);
  const validatedIds = new Set(
    (subs ?? [])
      .filter((s) => !validatedOnly || s.validation_category === "plausible" || s.validation_category === "higher")
      .map((s) => s.id)
  );

  const { data: pairs } = await supabase
    .from("pair_responses")
    .select("submission_id, image_pair_id, preference, comment")
    .in("submission_id", Array.from(validatedIds));

  return (
    <div>
      <h1 className="font-serif">Pair results</h1>
      <p className="mt-2 text-sm text-stone-600">
        Counts compare how often residents preferred the developer image, the citizen-refined image, or had no preference.
      </p>
      <div className="mt-4 text-sm">
        <a href="?validatedOnly=true" className={validatedOnly ? "underline" : ""}>Validated only</a>
        {" · "}
        <a href="?" className={!validatedOnly ? "underline" : ""}>All responses</a>
      </div>

      <div className="mt-6 space-y-8">
        {imagePairs.map((p) => {
          const rows = (pairs ?? []).filter((r) => r.image_pair_id === p.id);
          const total = rows.length;
          const dev = rows.filter((r) => r.preference === "developer").length;
          const ref = rows.filter((r) => r.preference === "refined").length;
          const np = rows.filter((r) => r.preference === "no_preference").length;
          const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
          const comments = rows.filter((r) => r.comment && r.comment.length > 0);
          return (
            <section key={p.id} className="card">
              <h2 className="font-serif">{p.title}</h2>
              <p className="text-xs text-stone-600">{p.id} · {p.category}</p>
              <p className="mt-3 text-sm">
                {total} responses · refined: {pct(ref)}% · developer: {pct(dev)}% · no preference: {pct(np)}%
              </p>
              {comments.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm underline">{comments.length} comments</summary>
                  <ul className="mt-2 text-sm space-y-2">
                    {comments.map((c, i) => (
                      <li key={i} className="border-l-2 border-stone-200 pl-3">{c.comment}</li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
