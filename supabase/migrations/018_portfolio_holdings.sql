-- Migration 018: Portfolio Holdings Table
-- Moves stock buy/sell records from localStorage to the database.

create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ticker text not null,
  company_name text not null,
  amount_zens integer not null,
  price_at_purchase integer not null default 0,
  purchase_date date not null default current_date,
  -- Sell fields (null = still held)
  sold boolean not null default false,
  sell_proceeds integer,
  sell_pnl integer,
  sell_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portfolio_user_date
  on public.portfolio_holdings (user_id, purchase_date desc);

alter table public.portfolio_holdings enable row level security;

create policy "holdings_select_own"
  on public.portfolio_holdings for select
  using (user_id = auth.uid());

create policy "holdings_insert_own"
  on public.portfolio_holdings for insert
  with check (user_id = auth.uid());

create policy "holdings_update_own"
  on public.portfolio_holdings for update
  using (user_id = auth.uid());

create policy "holdings_delete_own"
  on public.portfolio_holdings for delete
  using (user_id = auth.uid());
