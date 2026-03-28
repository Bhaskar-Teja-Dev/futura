-- Fix 1: Add `zens` column (blocks the Zens purchase flow entirely without this)
-- Existing users get 100 Zens; new users are handled by the updated trigger in migration 010.
alter table public.profiles
  add column if not exists zens integer not null default 100;

-- Remove stale RevenueCat column
alter table public.profiles
  drop column if exists revenuecat_user_id;
