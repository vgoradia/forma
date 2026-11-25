-- Production: run supabase/scan-usage.sql
-- That script is idempotent. It creates these tables, their RLS policies,
-- and the service-role functions that enforce scan limits.
-- This file is the table sketch. Run supabase/scan-usage.sql in the SQL editor.

-- Monthly scan counts (service role only; guests + users).
create table if not exists public.scan_usage_monthly (
  subject_key text not null,
  month_key text not null,
  scan_count integer not null default 0,
  primary key (subject_key, month_key),
  constraint scan_count_nonnegative check (scan_count >= 0)
);

alter table public.scan_usage_monthly enable row level security;

-- No policies: only service role should touch this table.

-- Per-user scan payloads (RLS: own rows only).
create table if not exists public.user_scans (
  scan_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, scan_id)
);

create index if not exists user_scans_saved_at_idx on public.user_scans (user_id, saved_at desc);

alter table public.user_scans enable row level security;

create policy "Users select own scans"
  on public.user_scans for select
  using (auth.uid() = user_id);

create policy "Users insert own scans"
  on public.user_scans for insert
  with check (auth.uid() = user_id);

create policy "Users update own scans"
  on public.user_scans for update
  using (auth.uid() = user_id);

create policy "Users delete own scans"
  on public.user_scans for delete
  using (auth.uid() = user_id);

-- Forma Plus is not a column in this schema. The plan lives on
-- auth.users.raw_app_meta_data.plan, which only the service role can write.
-- To copy a legacy user_metadata.plan value, run
-- supabase/backfill-plan-app-metadata.sql once in the SQL editor.
--
-- Public share links live in supabase/shared-verdicts.sql.
-- Run that file too (existing projects that already applied the statements above).
-- For scan limits and rate limits, run supabase/scan-usage.sql.
-- For the launch email list, run supabase/email-signups.sql.
