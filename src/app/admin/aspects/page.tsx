import { getServiceClient } from "@/lib/supabase";
import { aspects } from "@/content/aspects";

export const dynamic = "force-dynamic";

type Search = { validatedOnly?: string };

type AspectRow = {
  submission_id: string;
  aspect_n: number;
  star_developer: number | null;
  star_alt_1: number | null;
  star_alt_2: number | null;
  star_alt_3: number | null;
  comment: string | null;
};

function meanOrNull(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((s, n) => s + n, 0) / xs.length;
}

export default async function AspectsAdminPage({ searchParams }: { searchParams: Search }) {
  const validatedOnly = searchParams.validatedOnly === "true";
  const supabase = getServiceClient();

  const { data: subs } = await supabase
    .from("submissions")
    .select("id, validation_category")
    .not("completed_at", "is", null);

  const validatedIds = new Set(
    (subs ?? [])
      .filter(
        (s) =>
          !validatedOnly ||
          s.validation_category === "plausible" ||
          s.validation_category === "higher"
      )
      .map((s) => s.id)
  );

  const { data: rowsRaw } = await supabase
    .from("aspect_responses")
    .select("submission_id, aspect_n, star_developer, star_alt_1, star_alt_2, star_alt_3, comment")
    .in("submission_id", Array.from(validatedIds));
  const rows = (rowsRaw ?? []) as AspectRow[];

  return (
    <div>
      <h1 className="font-serif">Aspect results</h1>
      <p className="mt-2 text-sm text-stone-600">
        Mean star rating per image (1–5). “Wins” = the image with the highest rating in that response.
      </p>
      <div className="mt-4 text-sm">
        <a href="?validatedOnly=true" className={validatedOnly ? "underline" : ""}>Validated only</a>
        {" · "}
        <a href="?" className={!validatedOnly ? "underline" : ""}>All responses</a>
      </div>

      <div className="mt-6 space-y-8">
        {aspects.map((a) => {
          const aRows = rows.filter((r) => r.aspect_n === a.n);
          const total = aRows.length;
          const dev = aRows.map((r) => r.star_developer).filter((n): n is number => n != null);
          const alt1 = aRows.map((r) => r.star_alt_1).filter((n): n is number => n != null);
          const alt2 = aRows.map((r) => r.star_alt_2).filter((n): n is number => n != null);
          const alt3 = aRows.map((r) => r.star_alt_3).filter((n): n is number => n != null);

          let winsDev = 0, winsAlt1 = 0, winsAlt2 = 0, winsAlt3 = 0, ties = 0;
          for (const r of aRows) {
            const items: { k: "dev" | "alt1" | "alt2" | "alt3"; v: number }[] = [];
            if (r.star_developer != null) items.push({ k: "dev", v: r.star_developer });
            if (r.star_alt_1 != null) items.push({ k: "alt1", v: r.star_alt_1 });
            if (r.star_alt_2 != null) items.push({ k: "alt2", v: r.star_alt_2 });
            if (r.star_alt_3 != null) items.push({ k: "alt3", v: r.star_alt_3 });
            if (items.length === 0) continue;
            const max = Math.max(...items.map((i) => i.v));
            const winners = items.filter((i) => i.v === max);
            if (winners.length > 1) ties++;
            else {
              const k = winners[0].k;
              if (k === "dev") winsDev++;
              else if (k === "alt1") winsAlt1++;
              else if (k === "alt2") winsAlt2++;
              else winsAlt3++;
            }
          }

          const comments = aRows.filter((r) => r.comment && r.comment.trim().length > 0);

          const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(2));
          const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

          return (
            <section key={a.n} className="card">
              <h2 className="font-serif">Aspect {a.n}: {a.title}</h2>
              <p className="text-xs text-stone-600">{total} responses</p>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="Current" mean={fmt(meanOrNull(dev))} winsPct={`${pct(winsDev)}%`} n={dev.length} />
                {a.altIndices.includes(1) && (
                  <Stat label="Alt 1" mean={fmt(meanOrNull(alt1))} winsPct={`${pct(winsAlt1)}%`} n={alt1.length} />
                )}
                {a.altIndices.includes(2) && (
                  <Stat label="Alt 2" mean={fmt(meanOrNull(alt2))} winsPct={`${pct(winsAlt2)}%`} n={alt2.length} />
                )}
                {a.altIndices.includes(3) && (
                  <Stat label="Alt 3" mean={fmt(meanOrNull(alt3))} winsPct={`${pct(winsAlt3)}%`} n={alt3.length} />
                )}
              </div>
              <p className="mt-2 text-xs text-stone-600">Ties: {pct(ties)}%</p>

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

function Stat({ label, mean, winsPct, n }: { label: string; mean: string; winsPct: string; n: number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-stone-600">{label}</div>
      <div className="font-serif text-xl mt-1">{mean}<span className="text-sm text-stone-500"> mean</span></div>
      <div className="text-xs text-stone-700">{winsPct} wins · n={n}</div>
    </div>
  );
}
