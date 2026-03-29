-- Mirror profiles.display_name on user_subscriptions for denormalized reporting / joins.
alter table public.user_subscriptions
  add column if not exists display_name text;

update public.user_subscriptions us
set display_name = p.display_name
from public.profiles p
where p.id = us.user_id;

-- New users: seed subscription row with the same display name as profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display text;
begin
  v_display := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name');

  insert into public.profiles (id, email, display_name, avatar_url, zens)
  values (
    new.id,
    new.email,
    v_display,
    new.raw_user_meta_data->>'avatar_url',
    100
  )
  on conflict (id) do nothing;

  insert into public.user_subscriptions (user_id, entitlement, display_name)
  values (new.id, 'free', v_display)
  on conflict (user_id) do nothing;

  insert into public.streaks (user_id, current_streak, longest_streak)
  values (new.id, 0, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
