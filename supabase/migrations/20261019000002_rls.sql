-- Row level security. Owner access is checked in the database (public.is_owner()),
-- so owner data stays protected even if a request bypasses the Next.js guard.

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.stock_movements enable row level security;
alter table public.waitlist enable row level security;
alter table public.restock_marks enable row level security;
alter table public.discount_codes enable row level security;
alter table public.bundles enable row level security;
alter table public.drops enable row level security;
alter table public.site_settings enable row level security;
alter table public.owner_settings enable row level security;
alter table public.checkouts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.addresses enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;
alter table public.vip_sends enable row level security;
alter table public.activity_log enable row level security;

-- Profiles: users read their own row; they may change their names but never their role.
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_owner());
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (first_name, last_name) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- Catalogue: shoppers see visible products; the owner sees and edits everything.
create policy products_public_read on public.products for select
  using (visible or public.is_owner());
create policy products_owner_write on public.products for all
  using (public.is_owner()) with check (public.is_owner());

create policy variants_public_read on public.product_variants for select
  using (exists (select 1 from public.products p where p.id = product_id and (p.visible or public.is_owner())));
create policy variants_owner_write on public.product_variants for all
  using (public.is_owner()) with check (public.is_owner());

-- Drops and site settings are public (countdown, announcement bar, popup); only the owner edits them.
create policy drops_public_read on public.drops for select using (true);
create policy drops_owner_write on public.drops for all
  using (public.is_owner()) with check (public.is_owner());
create policy site_settings_public_read on public.site_settings for select using (true);
create policy site_settings_owner_write on public.site_settings for update
  using (public.is_owner()) with check (public.is_owner());

-- Orders: customers read their own orders (by account or by verified account email); the owner manages all.
create policy orders_select on public.orders for select
  using (
    public.is_owner()
    or user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy orders_owner_update on public.orders for update
  using (public.is_owner()) with check (public.is_owner());

create policy order_items_select on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id));

-- Addresses: each user manages their own.
create policy addresses_own on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Owner-only tables.
create policy owner_all on public.stock_movements for all using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.waitlist for all using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.restock_marks for all using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.discount_codes for all using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.bundles for all using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.owner_settings for all using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.checkouts for all using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.newsletter_subscribers for all using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.contact_messages for all using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.vip_sends for all using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.activity_log for all using (public.is_owner()) with check (public.is_owner());
