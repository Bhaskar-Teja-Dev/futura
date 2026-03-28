create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'GBP',
  contribution_date date not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_contributions_user_date
  on public.contributions (user_id, contribution_date desc);

alter table public.contributions enable row level security;

create policy if not exists "contrib_select_own"
on public.contributions for select
using (user_id = auth.uid());

create policy if not exists "contrib_insert_own"
on public.contributions for insert
with check (user_id = auth.uid());

create policy if not exists "contrib_update_own"
on public.contributions for update
using (user_id = auth.uid());
