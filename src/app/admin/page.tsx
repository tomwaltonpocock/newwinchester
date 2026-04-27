import { getServiceClient } from "@/lib/supabase";
import { AdminStatCard } from "@/components/AdminStatCard";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const supabase = getServiceClient();

  const [
    { count: started },
    { count: completed },
    { count: pendingUploads },
    { count: optedIn },
  ] = await Promise.all([
    supabase.from("submissions").select("id", { count: "exact", head: true }),
    supabase.from("submissions").select("id", { count: "exact", head: true }).not("completed_at", "is", null),
    supabase.from("uploads").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("consent_updates", true),
  ]);

  const { data: byCat } = await supabase
    .from("submissions")
    .select("validation_category")
    .not("completed_at", "is", null);
  const catCounts = { low: 0, plausible: 0, higher: 0 } as Record<string, number>;
  for (const r of byCat ?? []) {
    if (r.validation_category) catCounts[r.validation_category as string] = (catCounts[r.validation_category as string] ?? 0) + 1;
  }

  const { data: byPostcode } = await supabase
    .from("submissions")
    .select("postcode_status")
    .not("completed_at", "is", null);
  const pcCounts: Record<string, number> = {};
  for (const r of byPostcode ?? []) {
    const k = (r.postcode_status as string) || "invalid_or_missing";
    pcCounts[k] = (pcCounts[k] ?? 0) + 1;
  }

  const { data: bySource } = await supabase
    .from("submissions")
    .select("source")
    .not("completed_at", "is", null);
  const srcCounts: Record<string, number> = {};
  for (const r of bySource ?? []) {
    const k = (r.source as string) || "(unknown)";
    srcCounts[k] = (srcCounts[k] ?? 0) + 1;
  }

  const completionRate =
    (started ?? 0) > 0 ? Math.round(((completed ?? 0) / (started ?? 1)) * 100) : 0;

  return (
    <div>
      <h1 className="font-serif">Admin overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <AdminStatCard label="Started" value={started ?? 0} />
        <AdminStatCard label="Completed" value={completed ?? 0} />
        <AdminStatCard label="Completion rate" value={`${completionRate}%`} />
        <AdminStatCard label="Pending uploads" value={pendingUploads ?? 0} />
        <AdminStatCard label="Email opt-ins" value={optedIn ?? 0} />
        <AdminStatCard label="Higher confidence" value={catCounts.higher ?? 0} />
        <AdminStatCard label="Plausible" value={catCounts.plausible ?? 0} />
        <AdminStatCard label="Low confidence" value={catCounts.low ?? 0} />
      </div>

      <h2 className="font-serif mt-10">Postcode distribution</h2>
      <ul className="mt-2 text-sm">
        {Object.entries(pcCounts).map(([k, v]) => (
          <li key={k}>{k}: {v}</li>
        ))}
      </ul>

      <h2 className="font-serif mt-10">Source distribution</h2>
      <ul className="mt-2 text-sm">
        {Object.entries(srcCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => (
            <li key={k}>{k}: {v}</li>
          ))}
      </ul>
    </div>
  );
}
