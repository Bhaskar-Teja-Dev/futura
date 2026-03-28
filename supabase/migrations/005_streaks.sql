create table if not exists public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak int4 not null default 0,
  longest_streak int4 not null default 0,
  last_contribution_date date,
  updated_at timestamptz not null default now()
);

alter table public.streaks enable row level security;

create policy if not exists "streaks_select_own"
on public.streaks for select
using (user_id = auth.uid());
