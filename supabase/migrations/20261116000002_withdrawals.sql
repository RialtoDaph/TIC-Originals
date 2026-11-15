-- Widerrufsbutton (§ 356a BGB, EU 2023/2673): withdrawals declared through the website.
-- Written only by the server (service role); the owner reads them in the dashboard.
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  name text not null,
  order_no text not null,
  email text not null,
  lang text not null default 'de',
  order_id uuid references public.orders (id) on delete set null
);
create index if not exists withdrawals_order_idx on public.withdrawals (order_id);

alter table public.withdrawals enable row level security;
drop policy if exists withdrawals_owner_read on public.withdrawals;
create policy withdrawals_owner_read on public.withdrawals for select to authenticated using (public.is_owner());
