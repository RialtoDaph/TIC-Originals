-- Finanzen: business expenses with their receipts (Rechnungen).
-- Cash basis: an expense counts on the day the money left the account (paid_on).
-- Bookkeeping records must be kept (GoBD: receipts 8 years, books 10), so nothing here can be deleted:
--   * expenses are voided with deleted_at, never removed (no DELETE policy),
--   * every edit/void is copied to expense_history by a trigger,
--   * receipts are append-only: replacing one adds a row, the old file stays in the bucket.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  paid_on date not null,
  category text not null check (category in ('production', 'shipping', 'packaging', 'marketing', 'software', 'fees', 'other')),
  vendor text not null default '',
  vendor_invoice_no text not null default '',
  description text not null default '',
  -- Gross EUR cents actually debited. Negative = credit note from the vendor.
  amount_cents integer not null check (amount_cents <> 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists expenses_paid_on_idx on public.expenses (paid_on) where deleted_at is null;

create table if not exists public.expense_receipts (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id),
  path text not null unique,
  mime text not null,
  size_bytes integer not null,
  original_name text not null default '',
  uploaded_at timestamptz not null default now()
);
create index if not exists expense_receipts_expense_idx on public.expense_receipts (expense_id);

create table if not exists public.expense_history (
  id bigint generated always as identity primary key,
  expense_id uuid not null,
  changed_at timestamptz not null default now(),
  old_row jsonb not null
);
create index if not exists expense_history_expense_idx on public.expense_history (expense_id);

create or replace function public.expenses_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.expense_history (expense_id, old_row) values (old.id, to_jsonb(old));
  return new;
end;
$$;
revoke execute on function public.expenses_audit() from public, anon, authenticated;

drop trigger if exists expenses_audit on public.expenses;
create trigger expenses_audit before update on public.expenses for each row execute function public.expenses_audit();
drop trigger if exists expenses_touch on public.expenses;
create trigger expenses_touch before update on public.expenses for each row execute function public.touch_updated_at();

alter table public.expenses enable row level security;
alter table public.expense_receipts enable row level security;
alter table public.expense_history enable row level security;

drop policy if exists expenses_owner_select on public.expenses;
drop policy if exists expenses_owner_insert on public.expenses;
drop policy if exists expenses_owner_update on public.expenses;
create policy expenses_owner_select on public.expenses for select to authenticated using (public.is_owner());
create policy expenses_owner_insert on public.expenses for insert to authenticated with check (public.is_owner());
create policy expenses_owner_update on public.expenses for update to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists receipts_owner_select on public.expense_receipts;
drop policy if exists receipts_owner_insert on public.expense_receipts;
create policy receipts_owner_select on public.expense_receipts for select to authenticated using (public.is_owner());
create policy receipts_owner_insert on public.expense_receipts for insert to authenticated with check (public.is_owner());

drop policy if exists expense_history_owner_select on public.expense_history;
create policy expense_history_owner_select on public.expense_history for select to authenticated using (public.is_owner());

-- Private bucket: only the service role touches it; the owner opens receipts through /owner/receipt/[id]
-- (signed URL after an owner check). No storage policies on purpose.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
