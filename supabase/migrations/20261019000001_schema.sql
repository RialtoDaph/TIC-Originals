-- TIC Originals: core schema.
-- Money is stored in integer cents (EUR). Timestamps are timestamptz (shop timezone Europe/Berlin is applied in the app).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Profiles / roles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'owner')),
  first_name text not null default '',
  last_name text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text := coalesce(meta ->> 'full_name', meta ->> 'name', '');
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(nullif(meta ->> 'first_name', ''), nullif(meta ->> 'given_name', ''), split_part(full_name, ' ', 1), ''),
    coalesce(nullif(meta ->> 'last_name', ''), nullif(meta ->> 'family_name', ''),
             nullif(trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), ''), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- True when the current request is made by a user with role = 'owner'.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  category text not null default '',
  price_cents integer not null check (price_cents >= 0),
  color text not null default '',
  material_de text not null default '',
  material_en text not null default '',
  weight_g integer,
  description_de text,
  description_en text,
  care_de text,
  care_en text,
  -- Image paths (e.g. /img/x.jpg) or absolute URLs; resolved through NEXT_PUBLIC_IMAGE_BASE_URL.
  images text[] not null default '{}',
  visible boolean not null default true,
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null,
  stock integer not null default 0 check (stock >= 0),
  sort_order integer not null default 0,
  unique (product_id, size)
);
create index product_variants_product_idx on public.product_variants (product_id);

create table public.stock_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  delta integer not null,
  stock_after integer not null,
  reason text not null check (reason in ('order', 'cancel', 'manual', 'return')),
  ref text,
  at timestamptz not null default now()
);
create index stock_movements_at_idx on public.stock_movements (at);

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null,
  email text not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (product_id, size, email)
);

create table public.restock_marks (
  product_id uuid primary key references public.products (id) on delete cascade,
  ordered_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Discounts, bundles, drops, settings
-- ---------------------------------------------------------------------------
create table public.discount_codes (
  code text primary key check (code ~ '^[A-Z0-9]+$'),
  is_percent boolean not null default true,
  -- Percent (1-100) when is_percent, otherwise euros.
  value numeric(10, 2) not null check (value > 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  valid_until date,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0,
  first_order_only boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (not is_percent or value <= 100)
);

create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text not null default '',
  normal_cents integer not null check (normal_cents > 0),
  price_cents integer not null check (price_cents > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.drops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  live_at timestamptz not null,
  lock_shop boolean not null default false,
  -- Stock per variant captured when the drop goes live (for the drop comparison).
  stock_snapshot jsonb,
  snapshot_at timestamptz,
  live_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  free_ship_cents integer not null default 8000,
  ship_de_cents integer not null default 519,
  ship_intl_cents integer not null default 1419,
  usd_rate numeric(6, 3) not null default 1.10,
  popup_enabled boolean not null default true,
  popup_code text not null default 'TIC15',
  popup_pct integer not null default 15,
  popup_until text not null default '',
  ann_left text[] not null default '{}',
  ann_right text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.owner_settings (
  id integer primary key default 1 check (id = 1),
  notify_telegram boolean not null default false,
  telegram_chat text not null default '',
  notify_whatsapp boolean not null default false,
  whatsapp_no text not null default '',
  notify_events text[] not null default '{order,stock,refund}',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Checkout + orders
-- ---------------------------------------------------------------------------
create table public.checkouts (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  payment_intent_id text unique,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  first_name text not null,
  last_name text not null,
  street text not null,
  extra text not null default '',
  zip text not null,
  city text not null,
  country text not null,
  phone text not null default '',
  newsletter boolean not null default false,
  lang text not null default 'de',
  -- [{product_id, name, size, qty, unit_cents}]
  items jsonb not null,
  subtotal_cents integer not null,
  discount_code text,
  discount_cents integer not null default 0,
  shipping_cents integer not null,
  total_cents integer not null,
  status text not null default 'open' check (status in ('open', 'processing', 'succeeded', 'failed', 'canceled')),
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index checkouts_status_idx on public.checkouts (status, created_at);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  checkout_id uuid unique references public.checkouts (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  first_name text not null,
  last_name text not null,
  street text not null,
  extra text not null default '',
  zip text not null,
  city text not null,
  country text not null,
  phone text not null default '',
  lang text not null default 'de',
  subtotal_cents integer not null,
  discount_code text,
  discount_cents integer not null default 0,
  shipping_cents integer not null,
  total_cents integer not null,
  status text not null check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'returned', 'cancelled')),
  payment_status text not null check (payment_status in ('pending', 'paid', 'refunded', 'failed')),
  payment_method text not null default '',
  payment_intent_id text unique,
  carrier text not null default 'DHL',
  tracking text not null default '',
  note text not null default '',
  flags text[] not null default '{}',
  invoice_no text unique,
  refunded_cents integer not null default 0,
  placed_at timestamptz not null default now(),
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  returned_at timestamptz,
  refunded_at timestamptz,
  cancelled_at timestamptz,
  reminded_at timestamptz,
  -- Soft delete: hidden from the dashboard lists but kept for bookkeeping.
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);
create index orders_placed_idx on public.orders (placed_at);
create index orders_email_idx on public.orders (lower(email));
create index orders_user_idx on public.orders (user_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  size text not null,
  qty integer not null check (qty > 0),
  unit_cents integer not null
);
create index order_items_order_idx on public.order_items (order_id);

create sequence public.invoice_seq;

-- ---------------------------------------------------------------------------
-- Customers, marketing, ops
-- ---------------------------------------------------------------------------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  street text not null,
  extra text not null default '',
  zip text not null,
  city text not null,
  country text not null,
  phone text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

create table public.newsletter_subscribers (
  email text primary key,
  lang text not null default 'de',
  source text not null default '',
  created_at timestamptz not null default now(),
  -- TODO(double-opt-in): set when the subscriber confirms via the DOI email.
  confirmed_at timestamptz
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null,
  created_at timestamptz not null default now()
);

create table public.vip_sends (
  email text primary key,
  sent_at timestamptz not null default now()
);

create table public.activity_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid references auth.users (id) on delete set null,
  text text not null,
  -- Set for actions that complete a "Today" task (shown under "Done today").
  task_key text,
  -- Data needed to revert the action, or null when it cannot be undone (refunds, sent emails).
  undo jsonb,
  undone_at timestamptz
);
create index activity_log_at_idx on public.activity_log (at desc);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger checkouts_touch before update on public.checkouts for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger addresses_touch before update on public.addresses for each row execute function public.touch_updated_at();
create trigger site_settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();
create trigger owner_settings_touch before update on public.owner_settings for each row execute function public.touch_updated_at();
