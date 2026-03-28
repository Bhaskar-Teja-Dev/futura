create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  onboarding_complete boolean not null default false,
  revenuecat_user_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy if not exists "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

create policy if not exists "profiles_update_own"
on public.profiles for update
using (id = auth.uid());
