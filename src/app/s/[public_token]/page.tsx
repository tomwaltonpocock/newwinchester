import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase";
import { signedUrl } from "@/lib/storage";
import { aspects } from "@/content/aspects";

export const dynamic = "force-dynamic";

export default async function ShareSubmissionPage({
  params,
}: {
  params: { public_token: string };
}) {
  const supabase = getServiceClient();
  const { data: sub } = await supabase
    .from("submissions")
    .select("*")
    .eq("public_token", params.public_token)
    .maybeSingle();

  if (!sub || !sub.consent_share_council) return notFound();

  await supabase
    .from("submissions")
    .update({ council_share_viewed_count: (sub.council_share_viewed_count ?? 0) + 1 })
    .eq("id", sub.id);

  const { data: aspectRows } = await supabase
    .from("aspect_responses")
    .select("aspect_n, star_developer, star_alt_1, star_alt_2, star_alt_3, comment")
    .eq("submission_id", sub.id)
    .order("aspect_n", { ascending: true });

  const { data: ups } = await supabase
    .from("uploads")
    .select("id, object_key, consent_share, moderation_status")
    .eq("submission_id", sub.id);

  const showableUploads = (ups ?? []).filter(
    (u) => u.consent_share && u.moderation_status === "approved"
  );
  const uploadsWithUrls = await Promise.all(
    showableUploads.map(async (u) => ({ id: u.id, url: await signedUrl(u.object_key, 60 * 10) }))
  );

  const showComments = sub.consent_public_summary || sub.consent_share_council;

  return (
    <article className="max-w-prose2">
      <p className="text-xs uppercase tracking-widest text-stone-600">
        Resident submission summary
      </p>
      <h1 className="font-serif mt-2">Vision for Winchester</h1>
      <p className="mt-3 text-sm text-stone-700">
        Submitted {new Date(sub.completed_at ?? sub.created_at).toLocaleDateString("en-GB")}
        {sub.postcode_outward ? ` · ${sub.postcode_outward}` : ""}
        {sub.validation_category ? ` · validation: ${sub.validation_category}` : ""}
      </p>

      <h2 className="font-serif mt-8">Per-aspect ratings (1–5)</h2>
      <ul className="mt-2 text-sm space-y-3">
        {(aspectRows ?? []).map((r) => {
          const meta = aspects.find((a) => a.n === r.aspect_n);
          return (
            <li key={r.aspect_n} className="border-l-2 border-stone-200 pl-3">
              <strong>Aspect {r.aspect_n}{meta ? ` — ${meta.title}` : ""}:</strong>{" "}
              current {fmt(r.star_developer)}
              {(meta?.altIndices.includes(1) || r.star_alt_1 != null) && ` · alt 1 ${fmt(r.star_alt_1)}`}
              {(meta?.altIndices.includes(2) || r.star_alt_2 != null) && ` · alt 2 ${fmt(r.star_alt_2)}`}
              {(meta?.altIndices.includes(3) || r.star_alt_3 != null) && ` · alt 3 ${fmt(r.star_alt_3)}`}
              {showComments && r.comment ? <div className="mt-1 text-stone-700">{r.comment}</div> : null}
            </li>
          );
        })}
      </ul>

      {showComments && (sub.general_comment || sub.missing_info_comment) && (
        <>
          <h2 className="font-serif mt-8">Comments</h2>
          {sub.general_comment && <p className="mt-2">{sub.general_comment}</p>}
          {sub.missing_info_comment && (
            <p className="mt-2">
              <em>What worries me most:</em> {sub.missing_info_comment}
            </p>
          )}
        </>
      )}

      {Array.isArray(sub.missing_info) && sub.missing_info.length > 0 && (
        <>
          <h2 className="font-serif mt-8">Missing information requested</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {sub.missing_info.map((m: string) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      )}

      {uploadsWithUrls.length > 0 && (
        <>
          <h2 className="font-serif mt-8">Uploaded images</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {uploadsWithUrls.map((u) =>
              u.url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={u.id} src={u.url} alt="Uploaded by resident" className="rounded border border-stone-200" />
              ) : null
            )}
          </div>
        </>
      )}

      <p className="mt-10 text-xs text-stone-600">
        This page shows only what the resident consented to share. Personal details are not displayed.
      </p>
    </article>
  );
}

function fmt(n: number | null | undefined): string {
  return n == null ? "—" : String(n);
}
