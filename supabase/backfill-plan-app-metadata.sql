-- Move Forma Plus off client-writable user_metadata onto app_metadata.
--
-- Supabase lets a signed-in user update their own raw_user_meta_data
-- (auth.updateUser({ data })). raw_app_meta_data is service-role only.
-- The app now reads the plan from app_metadata and ignores user_metadata.
--
-- Run in Supabase → SQL Editor on the production project (postgres role).
-- No new environment variables. SUPABASE_SERVICE_ROLE_KEY must already be
-- set on Vercel so the Stripe webhook can keep writing app_metadata.
--
-- Paying users keep Plus even before this script: scan and profile load
-- still look up an active Stripe subscription by the auth email and then
-- persist app_metadata.plan. Run this so existing subscribers stay Plus
-- when Stripe is briefly unavailable, and so the scan path does not have
-- to call Stripe on every request.
--
-- IMPORTANT: user_metadata.plan was client-writable, so the preview below
-- can include people who granted themselves Plus. Review that list against
-- Stripe customers before running the UPDATE. If a row is not a real
-- subscriber, skip the UPDATE (or delete that user's plan key only).
-- The app downgrades app_metadata the next time that user loads a page
-- that calls /api/stripe/subscription-status, but the scan API trusts
-- app_metadata and would not revoke a bad backfill by itself.

-- 1. Preview. Run this first and compare emails to Stripe.
select
  id,
  email,
  raw_user_meta_data->>'plan' as user_metadata_plan,
  raw_app_meta_data->>'plan' as app_metadata_plan,
  created_at
from auth.users
where raw_user_meta_data->>'plan' = 'plus'
   or raw_app_meta_data->>'plan' = 'plus'
order by created_at;

-- 2. Copy a legacy Plus flag onto app_metadata. Idempotent.
--    Skip this statement if the preview is not all real subscribers.
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('plan', 'plus')
where raw_user_meta_data->>'plan' = 'plus'
  and raw_app_meta_data->>'plan' is distinct from 'plus';

-- 3. Remove the client-writable copy so it cannot be mistaken for entitlement.
--    Safe to run even when step 2 was skipped.
update auth.users
set raw_user_meta_data = raw_user_meta_data - 'plan'
where raw_user_meta_data ? 'plan';
