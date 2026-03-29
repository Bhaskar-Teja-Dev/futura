-- Migration 016: Fix refresh_elite_monthly_streak_tokens RPC
-- The previous RPC definition referenced a column alias 'u.last_token_reset'
-- which PostgreSQL could not resolve, causing a 500 on every API call that
-- invokes this function (including POST /api/contributions via profile.get).
--
-- This migration:
--   1. Ensures the last_token_reset column exists (in case migration 013 was skipped).
--   2. Recreates the RPC with a correct, unambiguous column reference.

-- Step 1: Add column if it doesn't already exist
alter table public.user_subscriptions
  add column if not exists last_token_reset timestamp with time zone default now();

-- Backfill existing elite rows that have a null value
update public.user_subscriptions
set last_token_reset = now()
where entitlement = 'elite'
  and last_token_reset is null;

-- Step 2: Drop the old broken function first (can't change return type with CREATE OR REPLACE)
drop function if exists public.refresh_elite_monthly_streak_tokens(uuid);

-- Step 3: Recreate the RPC with a fixed query (no alias, direct table reference)
create or replace function public.refresh_elite_monthly_streak_tokens(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement text;
  v_last_reset  timestamp with time zone;
  v_now         timestamp with time zone := now();
begin
  select entitlement, last_token_reset
  into   v_entitlement, v_last_reset
  from   public.user_subscriptions
  where  user_id = p_user_id;

  -- Only refresh for elite users whose last reset was in a prior calendar month
  if v_entitlement = 'elite' and (
    v_last_reset is null
    or date_trunc('month', v_last_reset) < date_trunc('month', v_now)
  ) then
    update public.user_subscriptions
    set    streak_recovery_tokens = 2,
           last_token_reset       = v_now
    where  user_id = p_user_id;
  end if;
end;
$$;
