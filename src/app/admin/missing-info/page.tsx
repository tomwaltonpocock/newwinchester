import { getServiceClient } from "@/lib/supabase";
import { missingInfoOptions } from "@/content/missingInfoOptions";

export const dynamic = "force-dynamic";

export default async function MissingInfoPage() {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("submissions")
    .select("missing_info, missing_info_comment, validation_category, consent_public_summary")
    .not("completed_at", "is", null);

  const counts: Record<string, number> = {};
  for (const r of data ?? []) {
    for (const m of (r.missing_info as string[]) ?? []) {
      counts[m] = (counts[m] ?? 0) + 1;
    }
  }

  const ordered = missingInfoOptions
    .map((o) => ({ option: o, count: counts[o] ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const comments = (data ?? [])
    .filter((r) => r.missing_info_comment && r.missing_info_comment.trim().length > 0)
    .map((r) => ({
      comment: r.missing_info_comment as string,
      validation: r.validation_category as string | null,
      publicOk: !!r.consent_public_summary,
    }));

  return (
    <div>
      <h1 className="font-serif">Missing information</h1>

      <table className="w-full mt-6 text-sm">
        <thead>
          <tr className="text-left border-b border-stone-200">
            <th className="py-2 pr-4">Option</th>
            <th className="py-2 pr-4">Count</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => (
            <tr key={row.option} className="border-b border-stone-100">
              <td className="py-2 pr-4">{row.option}</td>
              <td className="py-2 pr-4">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="font-serif mt-10">Comments</h2>
      <ul className="mt-3 text-sm space-y-3">
        {comments.map((c, i) => (
          <li key={i} className="border-l-2 border-stone-200 pl-3">
            <div>{c.comment}</div>
            <div className="text-xs text-stone-600 mt-1">
              validation: {c.validation || "—"} · public summary consent: {c.publicOk ? "yes" : "no"}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
