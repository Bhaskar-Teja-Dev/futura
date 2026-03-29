-- ============================================================
-- Migration 017: Full Schema Integrity Fix + New User Init
-- ============================================================
-- Problems fixed:
--   1. profiles table missing columns (age, retirement_age, monthly_income, zens, target_monthly_income)
--   2. streaks table missing previous_streak column
--   3. handle_new_user trigger out of date (still references revenuecat_customer_id,
--      doesn't initialize streaks.previous_streak, doesn't set last_token_reset)
--   4. Existing users with missing streak/subscription rows get backfilled
--   5. user_subscriptions entitlement constraint confirmed to include 'elite'
-- ============================================================

-- ── 1. PROFILES: add any missing columns ───────────────────────────
alter table public.profiles
  add column if not exists zens integer not null default 0,
  add column if not exists age integer,
  add column if not exists retirement_age integer,
  add column if not exists target_monthly_income numeric(10,2),
  add column if not exists monthly_income numeric(10,2);

-- ── 2. STREAKS: add previous_streak if missing ─────────────────────
alter table public.streaks
  add column if not exists previous_streak integer not null default 0;

-- ── 3. USER_SUBSCRIPTIONS: ensure last_token_reset + correct constraint
alter table public.user_subscriptions
  add column if not exists last_token_reset timestamp with time zone default now(),
  add column if not exists streak_recovery_tokens integer not null default 0,
  add column if not exists display_name text;

-- Drop old constraint that only allowed 'free' and 'pro'
alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_entitlement_check;

alter table public.user_subscriptions
  add constraint user_subscriptions_entitlement_check
  check (entitlement in ('free', 'pro', 'elite'));

-- ── 4. BACKFILL: create missing rows for existing users ────────────
-- Any user in profiles without a subscription row → seed as free
insert into public.user_subscriptions (user_id, entitlement, streak_recovery_tokens, last_token_reset)
select p.id, 'free', 0, now()
from   public.profiles p
where  not exists (
  select 1 from public.user_subscriptions s where s.user_id = p.id
);

-- Any user in profiles without a streaks row → seed as 0 streak
insert into public.streaks (user_id, current_streak, longest_streak, previous_streak)
select p.id, 0, 0, 0
from   public.profiles p
where  not exists (
  select 1 from public.streaks s where s.user_id = p.id
);

-- ── 5. REBUILD handle_new_user trigger (definitive version) ────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display text;
begin
  v_display := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );

  -- 5a. profiles row
  insert into public.profiles (
    id, email, display_name, avatar_url, zens, onboarding_complete
  )
  values (
    new.id,
    new.email,
    v_display,
    new.raw_user_meta_data->>'avatar_url',
    100,          -- starter ZENS
    false
  )
  on conflict (id) do nothing;

  -- 5b. subscription row (free tier, no revenuecat reference)
  insert into public.user_subscriptions (
    user_id, entitlement, streak_recovery_tokens, display_name, last_token_reset
  )
  values (
    new.id, 'free', 0, v_display, now()
  )
  on conflict (user_id) do nothing;

  -- 5c. streak row
  insert into public.streaks (
    user_id, current_streak, longest_streak, previous_streak
  )
  values (new.id, 0, 0, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Re-attach trigger (drop first to reset)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 6. RLS: ensure insert policy exists on streaks ─────────────────
create policy if not exists "streaks_insert_own"
on public.streaks for insert
with check (user_id = auth.uid());

create policy if not exists "streaks_update_own"
on public.streaks for update
using (user_id = auth.uid());

-- ── 7. RLS: ensure insert policy exists on user_subscriptions ──────
create policy if not exists "subs_insert_own"
on public.user_subscriptions for insert
with check (user_id = auth.uid());

-- ── 8. Recreate the monthly-token-refresh RPC (clean) ──────────────
drop function if exists public.refresh_elite_monthly_streak_tokens(uuid);

create or replace function public.refresh_elite_monthly_streak_tokens(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement  text;
  v_last_reset   timestamp with time zone;
  v_now          timestamp with time zone := now();
begin
  select entitlement, last_token_reset
  into   v_entitlement, v_last_reset
  from   public.user_subscriptions
  where  user_id = p_user_id;

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
