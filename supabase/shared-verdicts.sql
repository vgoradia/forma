-- Public verdict links.
-- Run once in Supabase → SQL Editor (safe to re-run).
--
-- What this stores: a sanitized product verdict (name, prices, recommendation).
-- It must not contain account emails, user ids, or uploaded screenshots.
-- The Next.js server writes with the service role. Clients cannot insert.
--
-- Public reads: anon and authenticated may fetch one row by id through
-- get_shared_verdict(share_id). They cannot list the table.

create table if not exists public.shared_verdicts (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint shared_verdicts_id_format check (id ~ '^[A-Za-z0-9]{10}$'),
  constraint shared_verdicts_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint shared_verdicts_payload_size check (octet_length(payload::text) <= 48000)
);

alter table public.shared_verdicts enable row level security;

revoke all on table public.shared_verdicts from anon, authenticated;
grant all on table public.shared_verdicts to service_role;

create or replace function public.get_shared_verdict(share_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select payload
  from public.shared_verdicts
  where id = share_id
    and id ~ '^[A-Za-z0-9]{10}$';
$$;

revoke all on function public.get_shared_verdict(text) from public;
grant execute on function public.get_shared_verdict(text) to anon, authenticated;

comment on table public.shared_verdicts is
  'Sanitized public verdict snapshots. No user id or email. Service role writes only.';
