-- Vision for Winchester — initial schema
-- Run via Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------- submissions ----------
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  public_token text unique not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  source text,
  referrer text,
  utm jsonb default '{}'::jsonb,
  user_agent_hash text,
  ip_hash text,
  participant_hash text,
  postcode_outward text,
  postcode_sector text,
  postcode_full text,
  postcode_status text check (postcode_status in (
    'winchester_city','winchester_district_or_nearby','uk_other','invalid_or_missing'
  )),
  geo_country text,
  geo_region text,
  geo_city text,
  validation_score int default 0,
  validation_category text check (validation_category in ('low','plausible','higher')),
  duplicate_flag boolean default false,
  suspicious_reasons text[] default '{}',
  overall_old_rating smallint,
  overall_current_rating smallint,
  overall_refined_rating smallint,
  missing_info text[] default '{}',
  missing_info_comment text,
  general_comment text,
  consent_share_council boolean default false,
  consent_public_summary boolean default false,
  consent_updates boolean default false,
  mailchimp_status text,
  mailchimp_member_id text,
  email_hash text,
  submitted_version text not null default '1',
  mailto_clicked_at timestamptz,
  council_share_viewed_count int default 0
);

create index if not exists submissions_created_at_idx on submissions (created_at desc);
create index if not exists submissions_participant_hash_idx on submissions (participant_hash);
create index if not exists submissions_ip_hash_idx on submissions (ip_hash);
create index if not exists submissions_validation_category_idx on submissions (validation_category);
create index if not exists submissions_source_idx on submissions (source);

-- ---------- pair_responses ----------
create table if not exists pair_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  image_pair_id text not null,
  pair_order int not null,
  left_kind text not null check (left_kind in ('developer','refined')),
  right_kind text not null check (right_kind in ('developer','refined')),
  preference text check (preference in ('developer','refined','no_preference')),
  comment text,
  created_at timestamptz not null default now(),
  unique (submission_id, image_pair_id)
);

create index if not exists pair_responses_pair_idx on pair_responses (image_pair_id);

-- ---------- uploads ----------
create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  object_key text not null,
  original_name text,
  mime_type text not null,
  size_bytes int not null,
  width int,
  height int,
  sha256 text,
  consent_share boolean default false,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists uploads_submission_idx on uploads (submission_id);
create index if not exists uploads_moderation_idx on uploads (moderation_status);

-- ---------- contact_messages ----------
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete set null,
  created_at timestamptz not null default now(),
  category text not null,
  name text,
  email_ciphertext text,
  email_hash text,
  message text not null,
  status text not null default 'new'
    check (status in ('new','needs_reply','replied','archived')),
  ip_hash text,
  participant_hash text
);

create index if not exists contact_messages_status_idx on contact_messages (status);
create index if not exists contact_messages_created_idx on contact_messages (created_at desc);

-- ---------- subscribers (fallback when Mailchimp not configured) ----------
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email_ciphertext text,
  email_hash text unique,
  status text not null default 'pending'
    check (status in ('pending','confirmed','unsubscribed','bounced')),
  source text,
  confirm_token text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz
);

create index if not exists subscribers_status_idx on subscribers (status);

-- ---------- rate_limit_events ----------
create table if not exists rate_limit_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  ip_hash text,
  participant_hash text,
  event_type text not null
);

create index if not exists rate_limit_events_ip_idx on rate_limit_events (ip_hash, event_type, created_at desc);
create index if not exists rate_limit_events_participant_idx on rate_limit_events (participant_hash, event_type, created_at desc);

-- ---------- admin_audit_events ----------
create table if not exists admin_audit_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  actor text,
  action text,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb
);

-- ---------- RLS ----------
-- All writes go through the server using the service-role key, which bypasses RLS.
-- We enable RLS so anon/auth keys cannot read or write directly.
alter table submissions enable row level security;
alter table pair_responses enable row level security;
alter table uploads enable row level security;
alter table contact_messages enable row level security;
alter table subscribers enable row level security;
alter table rate_limit_events enable row level security;
alter table admin_audit_events enable row level security;

-- No policies are created intentionally: anon/auth role gets no access.
-- The service role bypasses RLS and is used only by server route handlers.

-- ---------- Storage bucket ----------
-- Create the private bucket via Supabase dashboard or SQL:
--   insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false)
--   on conflict (id) do nothing;
-- (Run this once in your project; admin previews use signed URLs.)
