-- Add last_token_reset to user_subscriptions
-- This column tracks when the user's streak recovery tokens were last refreshed.

alter table public.user_subscriptions 
add column if not exists last_token_reset timestamp with time zone default now();

-- Update existing records to have a reasonable default if they are elite
update public.user_subscriptions 
set last_token_reset = now() 
where entitlement = 'elite' and last_token_reset is null;
