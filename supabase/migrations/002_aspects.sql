-- Aspects rework: replace pair-wise comparison with N-way ratings.
-- Each aspect has 1 developer image and up to 3 AI alternatives.
-- The user gives a star rating (1–5) per image and may leave a comment.

-- Drop the old pair_responses table; pre-launch only, no data to preserve.
drop table if exists pair_responses;

create table if not exists aspect_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  aspect_n int not null,
  -- Order in which the alternatives were displayed (e.g. [3,1,2]); used for analysis only.
  display_order int[] default '{}',
  -- Star ratings per image, 1–5. NULL means "no rating given".
  star_developer smallint check (star_developer between 1 and 5),
  star_alt_1     smallint check (star_alt_1 between 1 and 5),
  star_alt_2     smallint check (star_alt_2 between 1 and 5),
  star_alt_3     smallint check (star_alt_3 between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (submission_id, aspect_n)
);

create index if not exists aspect_responses_submission_idx on aspect_responses (submission_id);
create index if not exists aspect_responses_aspect_idx on aspect_responses (aspect_n);

alter table aspect_responses enable row level security;
-- No policies; service role bypasses RLS, anon/auth get no access.
