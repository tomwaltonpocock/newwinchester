-- Recipient messaging: residents can message named decision-makers via the
-- platform. Messages are stored, moderated by Claude Haiku (if configured),
-- and only auto-forwarded if classification = "forward" AND Resend is wired up.

alter table contact_messages add column if not exists recipient_id text;
alter table contact_messages add column if not exists moderation_decision text
  check (moderation_decision in ('forward','hold','reject'));
alter table contact_messages add column if not exists moderation_reason text;
alter table contact_messages add column if not exists forwarded_at timestamptz;

-- Expand status to cover new moderation/forwarding states.
alter table contact_messages drop constraint if exists contact_messages_status_check;
alter table contact_messages add constraint contact_messages_status_check
  check (status in ('new','needs_reply','replied','archived','held','forwarded','rejected'));

create index if not exists contact_messages_recipient_idx on contact_messages (recipient_id);
create index if not exists contact_messages_moderation_idx on contact_messages (moderation_decision);
