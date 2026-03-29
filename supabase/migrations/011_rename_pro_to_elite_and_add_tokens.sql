-- Rename Pro to Elite and add Streak Recovery Tokens
-- This migration updates the user_subscriptions table to standardize on 'elite' terminology
-- and adds the column for dynamic streak recovery tokens.

-- 1. Add streak_recovery_tokens column if it doesn't exist
alter table public.user_subscriptions 
add column if not exists streak_recovery_tokens int default 0;

-- 2. Update the check constraint for entitlement to include 'elite'
alter table public.user_subscriptions 
drop constraint if exists user_subscriptions_entitlement_check;

alter table public.user_subscriptions 
add constraint user_subscriptions_entitlement_check 
check (entitlement in ('free', 'pro', 'elite'));

-- 3. Migrate any existing 'pro' to 'elite'
update public.user_subscriptions 
set entitlement = 'elite' 
where entitlement = 'pro';

-- 4. Create an RPC to safely increment streak tokens
create or replace function public.increment_streak_tokens(user_id uuid, amount int)
returns void as $$
begin
  update public.user_subscriptions
  set streak_recovery_tokens = streak_recovery_tokens + amount
  where public.user_subscriptions.user_id = $1;
end;
$$ language plpgsql security definer;
