-- Thinkbox schema. Single-user app: no RLS-by-user, service role only.
-- Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- Google account + OAuth tokens (encrypted at the app layer, AES-GCM).
create table google_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  refresh_token_enc text not null,
  access_token_enc text,
  access_token_expires_at timestamptz,
  scopes text[] not null default '{}',
  history_id text,                -- Gmail incremental-sync cursor
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- One row per Gmail thread we have looked at.
create table threads (
  id text primary key,            -- Gmail thread id
  account_email text not null,
  subject text,
  snippet text,
  participants jsonb not null default '[]',   -- [{name,email}]
  last_message_at timestamptz,
  last_message_id text,
  last_from_me boolean default false,
  message_count int default 0,
  category text,                  -- decision | fyi | noise | signal_noise | scheduling
  triaged_at timestamptz,
  raw_labels text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index threads_last_message_idx on threads (last_message_at desc);
create index threads_category_idx on threads (category);

-- Decision cards distilled from threads.
create table decisions (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null references threads(id) on delete cascade,
  title text not null,            -- succinct statement of the decision
  summary text,                   -- 1-3 sentence context
  options jsonb default '[]',     -- suggested options, if any
  magnitude int not null default 3,        -- 1..5 model-scored
  rank_adjust int not null default 0,      -- user up/down votes on this card
  effective_rank double precision not null default 0,  -- computed ordering key
  kind text not null default 'reply',      -- reply | scheduling | task | fyi_ack
  status text not null default 'open',     -- open | drafted | done | dismissed | snoozed
  snoozed_until timestamptz,
  needs_reply_by timestamptz,
  draft_subject text,
  draft_body text,
  gmail_draft_id text,
  travel_note text,               -- e.g. "You are in NYC 12-16 Aug (from calendar)"
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index decisions_status_idx on decisions (status, effective_rank desc);

-- Learned ranking bias: when you up/down-rank, we remember per sender + kind.
create table rank_bias (
  key text primary key,           -- 'sender:foo@bar.com' | 'kind:scheduling'
  bias double precision not null default 0,
  samples int not null default 0,
  updated_at timestamptz not null default now()
);

-- Contacts indexed from the mailbox (the CRM layer).
create table contacts (
  email text primary key,
  name text,
  first_seen_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  inbound_count int default 0,
  outbound_count int default 0,
  median_gap_days double precision,        -- personal cadence baseline
  tone_score double precision,             -- -1..1, model-scored warmth of tone
  tone_summary text,
  warmth double precision,                 -- 0..100 computed
  is_power boolean not null default false, -- on the power list
  power_rank int,                          -- manual ordering within power list
  target_cadence_days int,                 -- optional manual override
  notes text,
  do_not_track boolean not null default false,
  updated_at timestamptz not null default now()
);
create index contacts_power_idx on contacts (is_power, power_rank);
create index contacts_warmth_idx on contacts (warmth);

-- Strategic priorities you set for a period.
create table priorities (
  id uuid primary key default gen_random_uuid(),
  period text not null default 'week',     -- week | month
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Stats: the library the weekly review draws from, and your kept dashboard.
create table stat_prefs (
  stat_key text primary key,               -- e.g. 'emails_in_out'
  kept boolean not null default true,
  custom_prompt text,                      -- for user-requested custom stats
  position int default 0,
  updated_at timestamptz not null default now()
);

create table weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  stats jsonb not null default '{}',       -- {stat_key: {label, value, detail}}
  narrative text,                          -- model-written look-back / look-forward
  created_at timestamptz not null default now()
);

-- Noise ledger: junk that was set aside, so nothing silently vanishes.
create table noise_log (
  message_id text primary key,
  thread_id text,
  from_email text,
  subject text,
  reason text,
  is_signal boolean not null default false,   -- e.g. DocSend alert → surfaced as signal
  signal_note text,                            -- "A. Smith viewed your deck (DocSend)"
  received_at timestamptz,
  created_at timestamptz not null default now()
);

-- Sender rules learned or set: always-noise, never-noise, signal extractors.
create table sender_rules (
  pattern text primary key,        -- email or domain, e.g. '@docsend.com'
  rule text not null,              -- 'noise' | 'never_noise' | 'signal'
  note text,
  created_at timestamptz not null default now()
);

-- Your authorial voice, distilled from sent mail.
create table voice_profile (
  id int primary key default 1,
  profile text,                    -- distilled style guide used in drafting prompts
  samples_analyzed int default 0,
  built_at timestamptz,
  constraint single_row check (id = 1)
);

-- Generic app settings (key/value).
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table google_accounts enable row level security;
alter table threads enable row level security;
alter table decisions enable row level security;
alter table rank_bias enable row level security;
alter table contacts enable row level security;
alter table priorities enable row level security;
alter table stat_prefs enable row level security;
alter table weekly_reviews enable row level security;
alter table noise_log enable row level security;
alter table sender_rules enable row level security;
alter table voice_profile enable row level security;
alter table settings enable row level security;
-- No policies: only the service-role key (server-side) can touch these tables.
