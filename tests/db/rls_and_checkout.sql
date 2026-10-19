-- Database tests: RLS for owner/customer/anon and the finalize_checkout state machine.
-- Run with tests/db/run.sh (expects a freshly reset database). Any failed assert aborts.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@tic.test', '{"first_name":"Olivia","last_name":"Owner"}'),
  ('00000000-0000-0000-0000-00000000000b', 'kunde@tic.test', '{"full_name":"Karl Kunde"}');
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-00000000000a';

do $$ begin
  assert (select first_name || ' ' || last_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 'Karl Kunde',
    'profile names derived from full_name';
end $$;

-- A hidden product is invisible to anon, visible to the owner.
update public.products set visible = false where slug = 'tic-sweatshorts';

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  assert (select count(*) from public.products) = 7, 'anon sees visible products only';
  assert (select count(*) from public.discount_codes) = 0, 'anon cannot read discount codes';
  assert (select count(*) from public.site_settings) = 1, 'anon reads site settings';
  assert not public.is_owner(), 'anon is not owner';
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","email":"kunde@tic.test","role":"authenticated"}', true);
do $$ begin
  assert not public.is_owner(), 'customer is not owner';
  assert (select count(*) from public.products) = 7, 'customer sees visible products only';
  assert (select count(*) from public.checkouts) = 0, 'customer cannot read checkouts';
  assert (select count(*) from public.activity_log) = 0, 'customer cannot read activity log';
end $$;
-- Customers cannot promote themselves.
do $$ begin
  begin
    update public.profiles set role = 'owner' where id = auth.uid();
    assert false, 'role update must be rejected';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.adjust_stock((select id from public.product_variants limit 1), 10);
    assert false, 'adjust_stock must be owner-only';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.finalize_checkout('pi_x', 'succeeded', 'card');
    assert false, 'finalize_checkout must not be callable by users';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.profiles set first_name = 'Karla' where id = auth.uid();
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"owner@tic.test","role":"authenticated"}', true);
do $$ begin
  assert public.is_owner(), 'owner is owner';
  assert (select count(*) from public.products) = 8, 'owner sees hidden products';
  assert (select count(*) from public.discount_codes) = 1, 'owner reads discount codes';
end $$;
reset role;

-- finalize_checkout: card payment succeeds directly.
insert into public.checkouts (order_no, payment_intent_id, email, first_name, last_name, street, zip, city, country,
  items, subtotal_cents, discount_code, discount_cents, shipping_cents, total_cents)
select 'TIC-2026-AAAAAA', 'pi_card', 'kunde@tic.test', 'Karl', 'Kunde', 'Weg 1', '85072', 'Eichstätt', 'DE',
  jsonb_build_array(jsonb_build_object('product_id', p.id, 'name', p.name, 'size', 'M', 'qty', 2, 'unit_cents', p.price_cents)),
  13978, 'TIC15', 2097, 0, 11881
from public.products p where p.slug = 'tic-heavyweight-hoodie';

do $$
declare r jsonb; o public.orders;
begin
  r := public.finalize_checkout('pi_card', 'succeeded', 'card');
  assert r ->> 'event' = 'created_paid', 'card order created paid';
  select * into o from public.orders where order_no = 'TIC-2026-AAAAAA';
  assert o.status = 'confirmed' and o.payment_status = 'paid', 'paid order is to ship';
  assert (select stock from public.product_variants v join public.products p on p.id = v.product_id
          where p.slug = 'tic-heavyweight-hoodie' and v.size = 'M') = 2, 'stock 4 - 2 = 2';
  assert (select used_count from public.discount_codes where code = 'TIC15') = 1, 'code usage counted';
  r := public.finalize_checkout('pi_card', 'succeeded', 'card');
  assert r ->> 'event' = 'noop', 'webhook retries are idempotent';
  assert (select count(*) from public.orders where order_no = 'TIC-2026-AAAAAA') = 1, 'no duplicate order';
end $$;

-- SEPA: processing reserves stock, failure releases it.
insert into public.checkouts (order_no, payment_intent_id, email, first_name, last_name, street, zip, city, country,
  items, subtotal_cents, discount_cents, shipping_cents, total_cents)
select 'TIC-2026-BBBBBB', 'pi_sepa', 'kunde@tic.test', 'Karl', 'Kunde', 'Weg 1', '85072', 'Eichstätt', 'DE',
  jsonb_build_array(jsonb_build_object('product_id', p.id, 'name', p.name, 'size', 'XL', 'qty', 5, 'unit_cents', p.price_cents)),
  34945, 0, 0, 34945
from public.products p where p.slug = 'tic-logo-tee';

do $$
declare r jsonb; o public.orders;
begin
  r := public.finalize_checkout('pi_sepa', 'processing', 'sepa_debit');
  assert r ->> 'event' = 'created_pending', 'sepa order created pending';
  assert (select stock from public.product_variants v join public.products p on p.id = v.product_id
          where p.slug = 'tic-logo-tee' and v.size = 'XL') = 2, 'stock reserved (7 - 5)';
  r := public.finalize_checkout('pi_sepa', 'failed', 'sepa_debit');
  assert r ->> 'event' = 'failed', 'sepa failure cancels';
  select * into o from public.orders where order_no = 'TIC-2026-BBBBBB';
  assert o.status = 'cancelled' and o.payment_status = 'failed', 'order cancelled';
  assert (select stock from public.product_variants v join public.products p on p.id = v.product_id
          where p.slug = 'tic-logo-tee' and v.size = 'XL') = 7, 'stock released';
end $$;

-- Oversold orders are flagged and stock never goes negative.
insert into public.checkouts (order_no, payment_intent_id, email, first_name, last_name, street, zip, city, country,
  items, subtotal_cents, discount_cents, shipping_cents, total_cents)
select 'TIC-2026-CCCCCC', 'pi_over', 'x@tic.test', 'X', 'Y', 'Weg 1', '85072', 'Eichstätt', 'DE',
  jsonb_build_array(jsonb_build_object('product_id', p.id, 'name', p.name, 'size', 'XL', 'qty', 1, 'unit_cents', p.price_cents)),
  11989, 0, 0, 11989
from public.products p where p.slug = 'till-i-collapse-piped-tracksuit';
do $$ begin
  perform public.finalize_checkout('pi_over', 'succeeded', 'card');
  assert (select 'oversold' = any(flags) from public.orders where order_no = 'TIC-2026-CCCCCC'), 'oversold flagged';
end $$;

-- Customers see their own orders only; tracking exposes no personal data.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","email":"kunde@tic.test","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from public.orders) = 2, 'customer sees orders placed with their email';
  assert (select count(*) from public.order_items) = 2, 'customer sees their order items';
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ declare t jsonb; begin
  assert (select count(*) from public.orders) = 0, 'anon sees no orders';
  t := public.track_order('tic-2026-aaaaaa');
  assert t ->> 'status' = 'confirmed', 'tracking works case-insensitively';
  assert not (t ? 'email') and not (t ? 'street'), 'tracking has no personal data';
end $$;
reset role;

rollback;
\echo 'db tests passed'
