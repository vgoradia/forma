-- Run supabase/scan-usage.sql in the Supabase SQL editor (production project).
-- Idempotent and self-contained: safe on a database where none of these tables exist.
--
-- service_role is the only role that can call consume_scan, release_scan, and
-- rate_limit_hit, and the only role that can read the counter tables.
-- user_scans stays available to the signed-in user through RLS.

create table if not exists public.scan_usage_monthly (
  subject_key text not null,
  month_key text not null,
  scan_count integer not null default 0,
  primary key (subject_key, month_key),
  constraint scan_count_nonnegative check (scan_count >= 0)
);

alter table public.scan_usage_monthly enable row level security;

revoke all on table public.scan_usage_monthly from public;
revoke all on table public.scan_usage_monthly from anon;
revoke all on table public.scan_usage_monthly from authenticated;
grant all on table public.scan_usage_monthly to service_role;

create table if not exists public.user_scans (
  scan_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, scan_id)
);

create index if not exists user_scans_saved_at_idx on public.user_scans (user_id, saved_at desc);

alter table public.user_scans enable row level security;

revoke all on table public.user_scans from anon;
grant select, insert, update, delete on table public.user_scans to authenticated;
grant all on table public.user_scans to service_role;

drop policy if exists "Users select own scans" on public.user_scans;
create policy "Users select own scans"
  on public.user_scans for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own scans" on public.user_scans;
create policy "Users insert own scans"
  on public.user_scans for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own scans" on public.user_scans;
create policy "Users update own scans"
  on public.user_scans for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own scans" on public.user_scans;
create policy "Users delete own scans"
  on public.user_scans for delete
  using (auth.uid() = user_id);

-- Fixed-window counters for /api/analyze, /api/share, and /api/image.
-- RLS on and no policies: the Data API cannot read or write this table.
create table if not exists public.rate_limits (
  "key" text primary key,
  window_start timestamptz not null,
  "count" integer not null default 0,
  constraint rate_limits_count_nonnegative check ("count" >= 0)
);

alter table public.rate_limits enable row level security;

revoke all on table public.rate_limits from public;
revoke all on table public.rate_limits from anon;
revoke all on table public.rate_limits from authenticated;
grant all on table public.rate_limits to service_role;

-- Atomically take one scan if the subject is still under p_limit.
-- Returns allowed = true and the count after the increment, or allowed = false
-- and the current count when the cap is already reached.
create or replace function public.consume_scan(p_subject text, p_month text, p_limit integer)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_subject is null
    or btrim(p_subject) = ''
    or p_month is null
    or btrim(p_month) = ''
    or p_limit is null
    or p_limit < 1
  then
    return query select false::boolean, 0::integer;
    return;
  end if;

  return query
  with attempted as (
    insert into public.scan_usage_monthly as usage (subject_key, month_key, scan_count)
    values (p_subject, p_month, 1)
    on conflict (subject_key, month_key)
    do update set scan_count = usage.scan_count + 1
    where usage.scan_count < p_limit
    returning usage.scan_count
  )
  select true::boolean, attempted.scan_count
  from attempted
  union all
  select false::boolean, existing.scan_count
  from public.scan_usage_monthly existing
  where existing.subject_key = p_subject
    and existing.month_key = p_month
    and not exists (select 1 from attempted);

  if not found then
    return query select false::boolean, 0::integer;
  end if;
end;
$$;

-- Give a reserved scan back when parsing or analysis fails. Never goes below 0.
create or replace function public.release_scan(p_subject text, p_month text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_subject is null or p_month is null then
    return;
  end if;

  update public.scan_usage_monthly
  set scan_count = greatest(scan_count - 1, 0)
  where subject_key = p_subject
    and month_key = p_month;
end;
$$;

-- Record one hit in the current fixed window.
-- Returns true when this request is allowed (count is still within p_max).
-- Returns false when the limit is already used up or the arguments are invalid.
create or replace function public.rate_limit_hit(
  p_key text,
  p_window_seconds integer,
  p_max integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket timestamptz;
  new_count integer;
begin
  if p_key is null
    or btrim(p_key) = ''
    or p_window_seconds is null
    or p_window_seconds < 1
    or p_max is null
    or p_max < 1
  then
    return false;
  end if;

  bucket := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as rl ("key", window_start, "count")
  values (p_key, bucket, 1)
  on conflict ("key") do update
  set
    window_start = excluded.window_start,
    "count" = case
      when rl.window_start = excluded.window_start then least(rl."count" + 1, p_max + 1)
      else 1
    end
  returning "count" into new_count;

  if new_count is null then
    return false;
  end if;

  return new_count <= p_max;
end;
$$;

revoke all on function public.consume_scan(text, text, integer) from public;
revoke all on function public.consume_scan(text, text, integer) from anon;
revoke all on function public.consume_scan(text, text, integer) from authenticated;
grant execute on function public.consume_scan(text, text, integer) to service_role;

revoke all on function public.release_scan(text, text) from public;
revoke all on function public.release_scan(text, text) from anon;
revoke all on function public.release_scan(text, text) from authenticated;
grant execute on function public.release_scan(text, text) to service_role;

revoke all on function public.rate_limit_hit(text, integer, integer) from public;
revoke all on function public.rate_limit_hit(text, integer, integer) from anon;
revoke all on function public.rate_limit_hit(text, integer, integer) from authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

comment on table public.scan_usage_monthly is
  'Monthly scan reservations. Service role only, via consume_scan and release_scan.';

comment on table public.rate_limits is
  'Fixed-window request counters. Service role only, via rate_limit_hit. RLS enabled, no policies.';

comment on function public.consume_scan(text, text, integer) is
  'Atomically reserve one scan when scan_count < p_limit. Granted to service_role only.';

comment on function public.release_scan(text, text) is
  'Return a reserved scan. Granted to service_role only.';

comment on function public.rate_limit_hit(text, integer, integer) is
  'Record a hit. True means the request is within p_max. Granted to service_role only.';
