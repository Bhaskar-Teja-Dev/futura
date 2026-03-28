create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  current_age int2 not null,
  retirement_age int2 not null,
  target_monthly_income numeric(10,2) not null,
  annual_return_rate numeric(5,4) not null default 0.0700,
  risk_profile text default 'moderate' check (risk_profile in ('conservative', 'moderate', 'aggressive')),
  updated_at timestamptz not null default now()
);

alter table public.user_goals enable row level security;

create policy if not exists "goals_select_own"
on public.user_goals for select
using (user_id = auth.uid());

create policy if not exists "goals_insert_own"
on public.user_goals for insert
with check (user_id = auth.uid());

create policy if not exists "goals_update_own"
on public.user_goals for update
using (user_id = auth.uid());
