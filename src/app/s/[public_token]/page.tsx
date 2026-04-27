import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase";
import { signedUrl } from "@/lib/storage";

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

  // Increment view counter (best-effort, not transactional).
  await supabase
    .from("submissions")
    .update({ council_share_viewed_count: (sub.council_share_viewed_count ?? 0) + 1 })
    .eq("id", sub.id);

  const { data: pairs } = await supabase
    .from("pair_responses")
    .select("image_pair_id, pair_order, preference, comment")
    .eq("submission_id", sub.id)
    .order("pair_order", { ascending: true });

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

      <h2 className="font-serif mt-8">Overall ratings</h2>
      <ul className="mt-2 text-sm">
        <li>Older approach: {sub.overall_old_rating ?? "not sure"}</li>
        <li>Current developer direction: {sub.overall_current_rating ?? "not sure"}</li>
        <li>Citizen-refined direction: {sub.overall_refined_rating ?? "not sure"}</li>
      </ul>

      <h2 className="font-serif mt-8">Per-pair preferences</h2>
      <ul className="mt-2 text-sm space-y-2">
        {(pairs ?? []).map((p) => (
          <li key={p.image_pair_id}>
            <strong>{p.image_pair_id}:</strong> {p.preference ?? "—"}
            {showComments && p.comment ? <div className="text-stone-700 mt-1">{p.comment}</div> : null}
          </li>
        ))}
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
