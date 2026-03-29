-- Elite: 2 streak recovery ("fire") tokens per calendar month.
-- Call from the API (with the user's JWT) before reading user_subscriptions.

create or replace function public.refresh_elite_monthly_streak_tokens(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tokens integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'forbidden';
  end if;

  update public.user_subscriptions u
  set streak_recovery_tokens = 2,
      last_token_reset = now(),
      updated_at = now()
  where u.user_id = p_user_id
    and u.entitlement = 'elite'
    and (
      u.last_token_reset is null
      or date_trunc('month', u.last_token_reset at time zone 'utc')
         < date_trunc('month', (now() at time zone 'utc'))
    );

  select coalesce(us.streak_recovery_tokens, 0) into v_tokens
  from public.user_subscriptions us
  where us.user_id = p_user_id;

  return coalesce(v_tokens, 0);
end;
$$;

grant execute on function public.refresh_elite_monthly_streak_tokens(uuid) to authenticated;

comment on function public.refresh_elite_monthly_streak_tokens(uuid) is
  'Sets streak_recovery_tokens to 2 for elite users when a new calendar month starts (UTC) or last_token_reset was null.';
