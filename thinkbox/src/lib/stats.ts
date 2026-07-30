import { db } from "./supabase";
import { textCall } from "./claude";
import { env } from "./env";

export type Stat = { key: string; label: string; value: string; detail?: string };

/** The built-in stat library. Each returns null if there's no data yet. */
export async function computeStats(weekStart: Date, weekEnd: Date): Promise<Stat[]> {
  const supa = db();
  const s = weekStart.toISOString();
  const e = weekEnd.toISOString();
  const out: Stat[] = [];

  const { count: inbound } = await supa.from("threads").select("id", { count: "exact", head: true }).gte("last_message_at", s).lt("last_message_at", e);
  const { count: decided } = await supa.from("decisions").select("id", { count: "exact", head: true }).eq("status", "done").gte("decided_at", s).lt("decided_at", e);
  const { count: open } = await supa.from("decisions").select("id", { count: "exact", head: true }).in("status", ["open", "drafted"]);
  const { count: noiseSetAside } = await supa.from("noise_log").select("message_id", { count: "exact", head: true }).gte("created_at", s).lt("created_at", e);
  const { data: bigDecided } = await supa.from("decisions").select("title, magnitude").eq("status", "done").gte("decided_at", s).lt("decided_at", e).order("magnitude", { ascending: false }).limit(3);
  const { data: aging } = await supa.from("contacts").select("email, name, warmth").eq("is_power", true).lt("warmth", 45).order("warmth").limit(5);
  const { data: warmed } = await supa.from("contacts").select("email, name").eq("is_power", true).gte("last_outbound_at", s).lt("last_outbound_at", e);

  out.push({ key: "threads_in", label: "Threads in", value: String(inbound ?? 0) });
  out.push({ key: "decisions_made", label: "Decisions made", value: String(decided ?? 0), detail: (bigDecided ?? []).map((d) => d.title).join(" · ") || undefined });
  out.push({ key: "decisions_open", label: "Decisions open", value: String(open ?? 0) });
  out.push({ key: "noise_set_aside", label: "Noise set aside", value: String(noiseSetAside ?? 0) });
  out.push({ key: "power_warmed", label: "Power list touched", value: String(warmed?.length ?? 0), detail: (warmed ?? []).map((w) => w.name || w.email).join(", ") || undefined });
  out.push({ key: "power_aging", label: "Relationships aging", value: String(aging?.length ?? 0), detail: (aging ?? []).map((a) => a.name || a.email).join(", ") || undefined });
  return out;
}

export async function buildWeeklyReview(): Promise<{ weekStart: string; stats: Stat[]; narrative: string }> {
  const now = new Date();
  // review covers the last full 7 days ending today
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const weekStart = new Date(weekEnd.getTime() - 7 * 86400_000);
  const stats = await computeStats(weekStart, weekEnd);

  const supa = db();
  const { data: priorities } = await supa.from("priorities").select("content, period").eq("active", true);
  const { data: openDecisions } = await supa.from("decisions").select("title, magnitude").in("status", ["open", "drafted"]).order("effective_rank", { ascending: false }).limit(8);

  const narrative = await textCall({
    model: env.draftingModel(),
    system: `You write a calm, grounded weekly review for the owner of an inbox-management tool. Two short sections: "The week past" and "The week ahead". Plain prose, British English, no headers beyond those two, no bullet points, no motivational filler. Tie observations to their stated priorities where genuine. ≤180 words total.`,
    user: JSON.stringify({
      stats: stats.map((s) => ({ label: s.label, value: s.value, detail: s.detail })),
      priorities: priorities ?? [],
      open_decisions: openDecisions ?? [],
      week_start: weekStart.toISOString().slice(0, 10),
    }),
    maxTokens: 500,
  });

  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const statsObj = Object.fromEntries(stats.map((s) => [s.key, s]));
  await supa.from("weekly_reviews").upsert({ week_start: weekStartStr, stats: statsObj, narrative }, { onConflict: "week_start" });
  return { weekStart: weekStartStr, stats, narrative };
}

/** A user-requested custom stat: computed by the model from aggregates we hand it. */
export async function computeCustomStat(prompt: string): Promise<Stat> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 86400_000);
  const supa = db();
  const { data: decisions } = await supa.from("decisions").select("title, kind, magnitude, status, created_at, decided_at").gte("created_at", weekStart.toISOString());
  const { data: threads } = await supa.from("threads").select("subject, category, last_message_at, participants").gte("last_message_at", weekStart.toISOString()).limit(200);
  const { data: noiseRows } = await supa.from("noise_log").select("from_email, subject, is_signal").gte("created_at", weekStart.toISOString()).limit(200);

  const answer = await textCall({
    model: env.draftingModel(),
    system: `Answer the user's question about their week of email with ONE number or very short phrase, then a ≤20-word detail on a second line. If the data can't answer it, say what's missing in ≤15 words.`,
    user: `Question: ${prompt}\n\nDecisions this week: ${JSON.stringify(decisions ?? [])}\n\nThreads: ${JSON.stringify((threads ?? []).slice(0, 120))}\n\nNoise: ${JSON.stringify(noiseRows ?? [])}`,
    maxTokens: 200,
  });
  const [value, ...rest] = answer.split("\n");
  return { key: `custom_${Date.now()}`, label: prompt.slice(0, 60), value: value.trim(), detail: rest.join(" ").trim() || undefined };
}
