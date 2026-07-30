import { db } from "./supabase";
import { env } from "./env";
import { listInboxMessages, listSentMessages, ensureLabel, labelMessage, ParsedMessage } from "./gmail";
import { getAccount } from "./google";
import { triageMessage, TriageResult } from "./triage";
import { effectiveRank } from "./rank";
import { upcomingTravel, travelOverlapping } from "./calendar";
import { medianGapDays, warmthScore } from "./warmth";

const LABELS = {
  noise: "Thinkbox/Noise",
  signal: "Thinkbox/Signal",
  decision: "Thinkbox/Decision",
};

/** Sender rules: exact email or '@domain' patterns. */
async function ruleFor(fromEmail: string): Promise<string | null> {
  const domain = "@" + fromEmail.split("@")[1];
  const { data } = await db().from("sender_rules").select("pattern, rule").in("pattern", [fromEmail, domain]);
  if (!data?.length) return null;
  const exact = data.find((r) => r.pattern === fromEmail);
  return (exact ?? data[0]).rule;
}

export async function runSync(opts: { maxMessages?: number } = {}): Promise<{ processed: number; decisions: number; noise: number }> {
  const account = await getAccount();
  if (!account) throw new Error("No Google account connected");
  const supa = db();

  const { data: acct } = await supa.from("google_accounts").select("last_synced_at").eq("email", account.email).single();
  const since = acct?.last_synced_at ? new Date(acct.last_synced_at) : new Date(Date.now() - 3 * 86400_000);
  // Gmail search 'after:' is second-granular epoch; pad back 1h for safety.
  const afterEpoch = Math.floor((since.getTime() - 3600_000) / 1000);

  const messages = await listInboxMessages({ maxResults: opts.maxMessages ?? 40, q: `after:${afterEpoch}` });
  const travel = await upcomingTravel(30).catch(() => []);

  let decisions = 0;
  let noise = 0;
  let processed = 0;

  const labelIds: Record<string, string> = {};
  for (const [k, name] of Object.entries(LABELS)) {
    labelIds[k] = await ensureLabel(name).catch(() => "");
  }

  for (const msg of messages) {
    // skip if already seen
    const { data: seenThread } = await supa.from("threads").select("id, last_message_id").eq("id", msg.threadId).maybeSingle();
    if (seenThread?.last_message_id === msg.id) continue;
    // skip own messages
    if (msg.from.email === account.email) continue;
    processed++;

    let triage: TriageResult;
    const rule = await ruleFor(msg.from.email);
    if (rule === "noise") {
      triage = { category: "noise", magnitude: 1, decision_title: null, decision_summary: null, options: [], kind: null, needs_reply_by: null, signal_note: null, noise_reason: "sender rule" };
    } else {
      try {
        triage = await triageMessage(msg, account.email);
      } catch {
        triage = { category: "fyi", magnitude: 2, decision_title: null, decision_summary: null, options: [], kind: null, needs_reply_by: null, signal_note: null, noise_reason: null };
      }
      if (rule === "never_noise" && (triage.category === "noise" || triage.category === "signal_noise")) {
        triage.category = "fyi";
      }
      if (rule === "signal" && triage.category === "noise") {
        triage.category = "signal_noise";
        triage.signal_note = triage.signal_note ?? `${msg.from.email}: ${msg.subject}`;
      }
    }

    await supa.from("threads").upsert({
      id: msg.threadId,
      account_email: account.email,
      subject: msg.subject,
      snippet: msg.snippet,
      participants: [msg.from, ...msg.to, ...msg.cc],
      last_message_at: msg.date.toISOString(),
      last_message_id: msg.id,
      last_from_me: false,
      category: triage.category,
      triaged_at: new Date().toISOString(),
      raw_labels: msg.labelIds,
      updated_at: new Date().toISOString(),
    });

    if (triage.category === "noise" || triage.category === "signal_noise") {
      noise++;
      await supa.from("noise_log").upsert({
        message_id: msg.id,
        thread_id: msg.threadId,
        from_email: msg.from.email,
        subject: msg.subject,
        reason: triage.noise_reason,
        is_signal: triage.category === "signal_noise",
        signal_note: triage.signal_note,
        received_at: msg.date.toISOString(),
      });
      const add = [triage.category === "signal_noise" ? labelIds.signal : labelIds.noise].filter(Boolean);
      const remove = env.archiveNoise() && triage.category === "noise" ? ["INBOX"] : [];
      if (add.length || remove.length) await labelMessage(msg.id, add, remove).catch(() => {});
    } else if (triage.category === "decision" || triage.category === "scheduling") {
      decisions++;
      const kind = triage.category === "scheduling" ? "scheduling" : triage.kind ?? "reply";
      // travel note if a scheduling ask lands while a trip is in the next 30 days
      let travelNote: string | null = null;
      if (kind === "scheduling" && travel.length) {
        const soon = travelOverlapping(travel, new Date().toISOString(), new Date(Date.now() + 21 * 86400_000).toISOString());
        if (soon.length) {
          travelNote = soon
            .map((t) => `${t.summary || "Away"} ${t.start.slice(0, 10)} → ${t.end.slice(0, 10)}${t.location ? ` (${t.location})` : ""}`)
            .join("; ");
        }
      }
      const rank = await computeRank(msg.from.email, kind, triage, msg.date);
      // one open decision per thread: update if exists
      const { data: existing } = await supa.from("decisions").select("id, rank_adjust").eq("thread_id", msg.threadId).in("status", ["open", "drafted", "snoozed"]).maybeSingle();
      const row = {
        thread_id: msg.threadId,
        title: triage.decision_title ?? msg.subject,
        summary: triage.decision_summary,
        options: triage.options ?? [],
        magnitude: triage.magnitude,
        kind,
        status: "open",
        needs_reply_by: triage.needs_reply_by,
        travel_note: travelNote,
        effective_rank: rank,
        updated_at: new Date().toISOString(),
      };
      if (existing) await supa.from("decisions").update(row).eq("id", existing.id);
      else await supa.from("decisions").insert(row);
      if (labelIds.decision) await labelMessage(msg.id, [labelIds.decision]).catch(() => {});
    }

    // contact bookkeeping (inbound)
    await touchContact(msg.from.email, msg.from.name, msg.date, "in");
  }

  // outbound contact bookkeeping from recent sent mail
  const sent = await listSentMessages(15, `after:${afterEpoch}`).catch(() => []);
  for (const s of sent) {
    for (const to of s.to) await touchContact(to.email, to.name, s.date, "out");
    // mark threads we replied to
    await supa.from("threads").update({ last_from_me: true, updated_at: new Date().toISOString() }).eq("id", s.threadId);
    // auto-complete open decisions on threads the owner has since replied to
    await supa.from("decisions").update({ status: "done", decided_at: new Date().toISOString() }).eq("thread_id", s.threadId).eq("status", "open");
  }

  await supa.from("google_accounts").update({ last_synced_at: new Date().toISOString() }).eq("email", account.email);
  return { processed, decisions, noise };
}

async function computeRank(sender: string, kind: string, triage: TriageResult, msgDate: Date): Promise<number> {
  const supa = db();
  const keys = [`sender:${sender}`, `kind:${kind}`];
  const { data } = await supa.from("rank_bias").select("key, bias").in("key", keys);
  const senderBias = data?.find((d) => d.key === keys[0])?.bias ?? 0;
  const kindBias = data?.find((d) => d.key === keys[1])?.bias ?? 0;
  return effectiveRank({
    magnitude: triage.magnitude,
    rankAdjust: 0,
    senderBias,
    kindBias,
    ageHours: (Date.now() - msgDate.getTime()) / 3600_000,
    needsReplyBy: triage.needs_reply_by ? new Date(triage.needs_reply_by) : null,
  });
}

async function touchContact(email: string, name: string, at: Date, dir: "in" | "out") {
  if (!email.includes("@")) return;
  const supa = db();
  const { data: c } = await supa.from("contacts").select("*").eq("email", email).maybeSingle();
  const iso = at.toISOString();
  if (!c) {
    await supa.from("contacts").insert({
      email,
      name: name || null,
      first_seen_at: iso,
      last_inbound_at: dir === "in" ? iso : null,
      last_outbound_at: dir === "out" ? iso : null,
      inbound_count: dir === "in" ? 1 : 0,
      outbound_count: dir === "out" ? 1 : 0,
    });
    return;
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name && !c.name) patch.name = name;
  if (dir === "in") {
    if (!c.last_inbound_at || iso > c.last_inbound_at) patch.last_inbound_at = iso;
    patch.inbound_count = (c.inbound_count ?? 0) + 1;
  } else {
    if (!c.last_outbound_at || iso > c.last_outbound_at) patch.last_outbound_at = iso;
    patch.outbound_count = (c.outbound_count ?? 0) + 1;
  }
  await supa.from("contacts").update(patch).eq("email", email);
}

/**
 * Deep index for the CRM: walk further back through sent mail to establish
 * per-contact cadence baselines and warmth. Run on demand from /people.
 */
export async function indexRelationships(maxSent = 200): Promise<{ contacts: number }> {
  const supa = db();
  const sent = await listSentMessages(maxSent);
  const byContact = new Map<string, { name: string; dates: Date[] }>();
  for (const s of sent) {
    for (const to of s.to) {
      const cur = byContact.get(to.email) ?? { name: to.name, dates: [] };
      cur.dates.push(s.date);
      if (to.name && !cur.name) cur.name = to.name;
      byContact.set(to.email, cur);
    }
  }
  for (const [email, info] of byContact) {
    const dates = info.dates.sort((a, b) => a.getTime() - b.getTime());
    const gap = medianGapDays(dates);
    const { data: c } = await supa.from("contacts").select("*").eq("email", email).maybeSingle();
    const last = dates.at(-1)!;
    const lastContact = c?.last_inbound_at && new Date(c.last_inbound_at) > last ? new Date(c.last_inbound_at) : last;
    const warmth = warmthScore({
      lastContactAt: lastContact,
      medianGapDays: gap,
      targetCadenceDays: c?.target_cadence_days ?? null,
      toneScore: c?.tone_score ?? null,
    });
    await supa.from("contacts").upsert({
      email,
      name: info.name || c?.name || null,
      first_seen_at: c?.first_seen_at ?? dates[0].toISOString(),
      last_outbound_at: last.toISOString(),
      outbound_count: Math.max(c?.outbound_count ?? 0, dates.length),
      median_gap_days: gap,
      warmth,
      updated_at: new Date().toISOString(),
    });
  }
  return { contacts: byContact.size };
}

/** Recompute warmth for all tracked contacts (cheap, no API calls). */
export async function refreshWarmth(): Promise<number> {
  const supa = db();
  const { data: contacts } = await supa.from("contacts").select("*").eq("do_not_track", false);
  let n = 0;
  for (const c of contacts ?? []) {
    const last = [c.last_inbound_at, c.last_outbound_at].filter(Boolean).sort().at(-1);
    const warmth = warmthScore({
      lastContactAt: last ? new Date(last) : null,
      medianGapDays: c.median_gap_days,
      targetCadenceDays: c.target_cadence_days,
      toneScore: c.tone_score,
    });
    await supa.from("contacts").update({ warmth, updated_at: new Date().toISOString() }).eq("email", c.email);
    n++;
  }
  return n;
}
