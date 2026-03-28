-- Fix 4: Remove stale RevenueCat column from user_subscriptions
alter table public.user_subscriptions
  drop column if exists revenuecat_customer_id;

-- Update the new-user trigger to seed zens = 100 and remove RevenueCat reference
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, zens)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    100
  )
  on conflict (id) do nothing;

  insert into public.user_subscriptions (user_id, entitlement)
  values (new.id, 'free')
  on conflict (user_id) do nothing;

  insert into public.streaks (user_id, current_streak, longest_streak)
  values (new.id, 0, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
