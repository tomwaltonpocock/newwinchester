import { sql } from "./db";
import { textCall } from "./claude";
import { env } from "./env";

export type Stat = { key: string; label: string; value: string; detail?: string };

/** The built-in stat library. */
export async function computeStats(weekStart: Date, weekEnd: Date): Promise<Stat[]> {
  const s = weekStart.toISOString();
  const e = weekEnd.toISOString();
  const out: Stat[] = [];

  const [inbound] = await sql`select count(*)::int as n from threads where last_message_at >= ${s} and last_message_at < ${e}`;
  const [decided] = await sql`select count(*)::int as n from decisions where status = 'done' and decided_at >= ${s} and decided_at < ${e}`;
  const [open] = await sql`select count(*)::int as n from decisions where status in ('open','drafted')`;
  const [noiseSetAside] = await sql`select count(*)::int as n from noise_log where created_at >= ${s} and created_at < ${e}`;
  const bigDecided = await sql`select title from decisions where status = 'done' and decided_at >= ${s} and decided_at < ${e} order by magnitude desc limit 3`;
  const aging = await sql`select email, name from contacts where is_power = true and warmth < 45 order by warmth limit 5`;
  const warmed = await sql`select email, name from contacts where is_power = true and last_outbound_at >= ${s} and last_outbound_at < ${e}`;

  out.push({ key: "threads_in", label: "Threads in", value: String(inbound?.n ?? 0) });
  out.push({ key: "decisions_made", label: "Decisions made", value: String(decided?.n ?? 0), detail: bigDecided.map((d) => d.title).join(" · ") || undefined });
  out.push({ key: "decisions_open", label: "Decisions open", value: String(open?.n ?? 0) });
  out.push({ key: "noise_set_aside", label: "Noise set aside", value: String(noiseSetAside?.n ?? 0) });
  out.push({ key: "power_warmed", label: "Power list touched", value: String(warmed.length), detail: warmed.map((w) => w.name || w.email).join(", ") || undefined });
  out.push({ key: "power_aging", label: "Relationships aging", value: String(aging.length), detail: aging.map((a) => a.name || a.email).join(", ") || undefined });
  return out;
}

export async function buildWeeklyReview(): Promise<{ weekStart: string; stats: Stat[]; narrative: string }> {
  const now = new Date();
  // review covers the last full 7 days ending today
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const weekStart = new Date(weekEnd.getTime() - 7 * 86400_000);
  const stats = await computeStats(weekStart, weekEnd);

  const priorities = await sql`select content, period from priorities where active = true`;
  const openDecisions = await sql`select title, magnitude from decisions where status in ('open','drafted') order by effective_rank desc limit 8`;

  const narrative = await textCall({
    model: env.draftingModel(),
    system: `You write a calm, grounded weekly review for the owner of an inbox-management tool. Two short sections: "The week past" and "The week ahead". Plain prose, British English, no headers beyond those two, no bullet points, no motivational filler. Tie observations to their stated priorities where genuine. ≤180 words total.`,
    user: JSON.stringify({
      stats: stats.map((s) => ({ label: s.label, value: s.value, detail: s.detail })),
      priorities,
      open_decisions: openDecisions,
      week_start: weekStart.toISOString().slice(0, 10),
    }),
    maxTokens: 500,
  });

  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const statsJson = JSON.stringify(Object.fromEntries(stats.map((s) => [s.key, s])));
  await sql`
    insert into weekly_reviews (week_start, stats, narrative)
    values (${weekStartStr}, ${statsJson}::jsonb, ${narrative})
    on conflict (week_start) do update set stats = excluded.stats, narrative = excluded.narrative`;
  return { weekStart: weekStartStr, stats, narrative };
}

/** A user-requested custom stat: computed by the model from aggregates we hand it. */
export async function computeCustomStat(prompt: string): Promise<Stat> {
  const weekStart = new Date(Date.now() - 7 * 86400_000).toISOString();
  const decisions = await sql`select title, kind, magnitude, status, created_at, decided_at from decisions where created_at >= ${weekStart}`;
  const threads = await sql`select subject, category, last_message_at, participants from threads where last_message_at >= ${weekStart} limit 200`;
  const noiseRows = await sql`select from_email, subject, is_signal from noise_log where created_at >= ${weekStart} limit 200`;

  const answer = await textCall({
    model: env.draftingModel(),
    system: `Answer the user's question about their week of email with ONE number or very short phrase, then a ≤20-word detail on a second line. If the data can't answer it, say what's missing in ≤15 words.`,
    user: `Question: ${prompt}\n\nDecisions this week: ${JSON.stringify(decisions)}\n\nThreads: ${JSON.stringify(threads.slice(0, 120))}\n\nNoise: ${JSON.stringify(noiseRows)}`,
    maxTokens: 200,
  });
  const [value, ...rest] = answer.split("\n");
  return { key: `custom_${Date.now()}`, label: prompt.slice(0, 60), value: value.trim(), detail: rest.join(" ").trim() || undefined };
}
