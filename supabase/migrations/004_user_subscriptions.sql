create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  revenuecat_customer_id text unique,
  entitlement text not null default 'free' check (entitlement in ('free', 'pro')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;

create policy if not exists "subs_select_own"
on public.user_subscriptions for select
using (user_id = auth.uid());
