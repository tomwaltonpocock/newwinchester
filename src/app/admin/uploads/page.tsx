import { getServiceClient } from "@/lib/supabase";
import { ModerateButton } from "./ModerateButton";

export const dynamic = "force-dynamic";

export default async function UploadsPage() {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("uploads")
    .select("id, submission_id, mime_type, size_bytes, consent_share, moderation_status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-serif">Upload moderation</h1>
      <p className="mt-2 text-sm text-stone-600">
        Previews are signed URLs valid for 5 minutes. Public URLs are never shown.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        {(data ?? []).map((u) => (
          <div key={u.id} className="card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/admin/uploads/${u.id}/preview`}
              alt="upload preview"
              className="w-full aspect-[4/3] object-cover rounded border border-stone-200"
            />
            <p className="mt-2 text-xs text-stone-600">
              {u.mime_type} · {(u.size_bytes / 1024).toFixed(0)} KB ·
              consent share: {u.consent_share ? "yes" : "no"}
            </p>
            <p className="text-xs">Status: <strong>{u.moderation_status}</strong></p>
            <div className="mt-3 flex gap-2">
              <ModerateButton id={u.id} status="approved" />
              <ModerateButton id={u.id} status="rejected" />
              <ModerateButton id={u.id} status="pending" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
