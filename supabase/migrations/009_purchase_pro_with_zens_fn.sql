-- Fix 3: Create the atomic function called by POST /api/subscriptions/purchase-pro.
-- Without this the entire Pro purchase path throws a 500 immediately.
create or replace function public.purchase_pro_with_zens(
  p_user_id uuid,
  p_cost    integer,
  p_days    integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_zens integer;
  v_new_zens     integer;
  v_expires      timestamptz;
begin
  -- Lock the profile row to prevent a double-spend race condition
  select zens
  into   v_current_zens
  from   public.profiles
  where  id = p_user_id
  for    update;

  if v_current_zens is null then
    raise exception 'Profile not found for user %', p_user_id;
  end if;

  if v_current_zens < p_cost then
    raise exception 'Insufficient Zens: have %, need %', v_current_zens, p_cost;
  end if;

  v_new_zens := v_current_zens - p_cost;
  v_expires  := now() + (p_days || ' days')::interval;

  -- Deduct Zens
  update public.profiles
  set    zens = v_new_zens
  where  id   = p_user_id;

  -- Grant Pro (extend if already Pro — take the later expiry)
  insert into public.user_subscriptions (user_id, entitlement, expires_at, updated_at)
  values (p_user_id, 'pro', v_expires, now())
  on conflict (user_id) do update
    set entitlement = 'pro',
        expires_at  = greatest(user_subscriptions.expires_at, excluded.expires_at),
        updated_at  = now();

  return jsonb_build_object(
    'zens',       v_new_zens,
    'expires_at', v_expires
  );
end;
$$;

-- Also add the missing UPDATE policy on user_subscriptions
-- (the trigger only inserts; the function above updates — needs RLS permission)
create policy if not exists "subs_update_own"
on public.user_subscriptions for update
using (user_id = auth.uid());
