-- Run once in the Supabase SQL editor (production project).
-- Idempotent. Safe to re-run.
--
-- Launch and weekly email opt-ins. Emails are stored lowercased, so the
-- unique constraint rejects Person@x.com after person@x.com.
-- RLS is on and there are no policies: anon and authenticated cannot read
-- or write. Inserts go through the service role from /api/email-signup.

create table if not exists public.email_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  created_at timestamptz not null default now(),
  user_agent text,
  constraint email_signups_email_unique unique (email),
  constraint email_signups_email_lowercase check (email = lower(email)),
  constraint email_signups_email_shape check (
    char_length(email) between 3 and 254
    and position('@' in email) > 1
  ),
  constraint email_signups_source_length check (source is null or char_length(source) <= 40),
  constraint email_signups_user_agent_length check (user_agent is null or char_length(user_agent) <= 512)
);

alter table public.email_signups enable row level security;

revoke all on table public.email_signups from public;
revoke all on table public.email_signups from anon;
revoke all on table public.email_signups from authenticated;
grant all on table public.email_signups to service_role;

comment on table public.email_signups is
  'Optional email opt-ins. Service role inserts only. RLS enabled, no policies.';
