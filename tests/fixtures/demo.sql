-- TEST FIXTURE ONLY (never loaded in production): demo data shaped like the prototype's sample data,
-- with dates relative to now(), so the dashboard can be reviewed and e2e-tested locally.
-- Logins: owner@tic.test / owner-pass-123 (role owner), kunde@tic.test / kunde-pass-123.

insert into auth.users (id, email, encrypted_password, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@tic.test', crypt('owner-pass-123', gen_salt('bf')), '{"first_name":"Olivia","last_name":"Owner"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'kunde@tic.test', crypt('kunde-pass-123', gen_salt('bf')), '{"first_name":"Lena","last_name":"Hofmann"}')
on conflict do nothing;
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000a1';

insert into public.discount_codes (code, is_percent, value, min_order_cents, valid_until, usage_limit, used_count, first_order_only, active) values
  ('DROP002', true, 20, 10000, (now() + interval '12 days')::date, 500, 87, false, true),
  ('WELCOME10', false, 10, 6000, null, null, 43, true, false)
on conflict do nothing;
update public.discount_codes set used_count = 214 where code = 'TIC15';

insert into public.bundles (name, summary, normal_cents, price_cents, active)
values ('Tee Duo', '1× Logo Tee Black + 1× Logo Tee Sky', 6978, 5900, true);

-- Drop 001 went live 30 days ago (with a stock snapshot); drop 002 is upcoming.
delete from public.drops;
insert into public.drops (name, live_at, lock_shop, stock_snapshot, snapshot_at, created_at)
select '001', now() - interval '30 days', false, jsonb_object_agg(v.id, v.stock + 20), now() - interval '30 days', now() - interval '40 days'
from public.product_variants v;
insert into public.drops (name, live_at, lock_shop, created_at)
values ('002', date_trunc('day', now() + interval '5 days') + interval '18 hours', false, now());

-- Waitlist for sold-out sizes.
insert into public.waitlist (product_id, size, email)
select p.id, 'XL', 'wait' || g || '@mail.de' from public.products p, generate_series(1, 23) g where p.slug = 'till-i-collapse-piped-tracksuit';
insert into public.waitlist (product_id, size, email)
select p.id, 'XL', 'wait' || g || '@mail.de' from public.products p, generate_series(1, 9) g where p.slug = 'tic-sweatshorts';

-- Orders: (status, payment, items[slug, size, qty], code, customer index, days ago)
do $$
declare
  spec jsonb := '[
    ["confirmed","paid",[["tic-heavyweight-hoodie","M",1],["tic-logo-tee","L",1]],"TIC15",0,0],
    ["confirmed","paid",[["till-i-collapse-piped-tracksuit","L",1]],"",1,0],
    ["confirmed","paid",[["tic-logo-tee-sky","M",2]],"",2,1],
    ["pending","pending",[["tic-acid-wash-hoodie-grau","S",1]],"",3,1],
    ["confirmed","paid",[["tic-acid-wash-hoodie-grau","M",1]],"",10,1],
    ["shipped","paid",[["tic-wide-sweatpants","M",1],["tic-logo-tee","M",1]],"",1,2],
    ["delivered","paid",[["tic-acid-wash-sweatpants-grau","L",1]],"",4,3],
    ["delivered","paid",[["till-i-collapse-piped-tracksuit","S",1],["tic-heavyweight-hoodie","S",1]],"DROP002",5,4],
    ["shipped","paid",[["tic-heavyweight-hoodie","L",1]],"",6,5],
    ["cancelled","failed",[["tic-sweatshorts","L",1]],"",7,6],
    ["delivered","paid",[["tic-logo-tee","L",1],["tic-logo-tee-sky","L",1]],"",0,8],
    ["returned","paid",[["tic-acid-wash-hoodie-grau","L",1]],"",8,9],
    ["delivered","paid",[["till-i-collapse-piped-tracksuit","M",1],["tic-wide-sweatpants","M",1]],"TIC15",1,11],
    ["delivered","paid",[["tic-sweatshorts","M",1]],"",9,13]
  ]';
  names jsonb := '[["Lena","Hofmann","Berlin","DE"],["Jonas","Weber","München","DE"],["Mia","Schneider","Hamburg","DE"],["Leon","Fischer","Köln","DE"],["Emma","Wagner","Ingolstadt","DE"],["Paul","Becker","Frankfurt","DE"],["Sofia","Rossi","Milano","IT"],["Noah","Klein","Wien","AT"],["Hannah","Wolf","Nürnberg","DE"],["Elias","Braun","Eichstätt","DE"],["Amelie","Hartmann","Leipzig","DE"]]';
  s jsonb; it jsonb; n jsonb; i int := 0;
  sub int; disc int; ship int; placed timestamptz; oid uuid; email text; p record;
begin
  for s in select * from jsonb_array_elements(spec) loop
    n := names -> ((s ->> 4)::int);
    email := lower(n ->> 0) || '.' || replace(replace(replace(lower(n ->> 1), 'ö', 'oe'), 'ü', 'ue'), 'ä', 'ae') || '@mail.de';
    if (s ->> 4)::int = 0 then email := 'kunde@tic.test'; end if;
    placed := now() - ((s ->> 5)::int || ' days')::interval - ((i % 7) || ' hours')::interval - interval '1 hour';
    sub := 0;
    for it in select * from jsonb_array_elements(s -> 2) loop
      select price_cents into p from public.products where slug = it ->> 0;
      sub := sub + p.price_cents * (it ->> 2)::int;
    end loop;
    disc := case s ->> 3 when 'TIC15' then round(sub * 0.15) when 'DROP002' then round(sub * 0.20) else 0 end;
    ship := case when sub - disc >= 8000 then 0 when n ->> 3 = 'DE' then 519 else 1419 end;
    insert into public.orders (order_no, email, first_name, last_name, street, zip, city, country, subtotal_cents, discount_code, discount_cents,
      shipping_cents, total_cents, status, payment_status, payment_method, carrier, tracking, placed_at, paid_at, shipped_at, delivered_at, returned_at, cancelled_at)
    values ('TIC-2026-D' || lpad((164 - i)::text, 5, '0'), email, n ->> 0, n ->> 1, 'Musterstraße ' || (i + 1) * 7, lpad((80000 + i * 911)::text, 5, '0'), n ->> 2, n ->> 3,
      sub, nullif(s ->> 3, ''), disc, ship, sub - disc + ship, s ->> 0, s ->> 1,
      case when i % 3 = 1 then 'PayPal' when s ->> 1 = 'pending' then 'SEPA' else 'Card (Stripe)' end,
      'DHL', case when s ->> 0 in ('shipped', 'delivered', 'returned') then '00340434' || (161094042 + i * 7919) else '' end,
      placed, case when s ->> 1 = 'paid' then placed + interval '1 minute' end,
      case when s ->> 0 in ('shipped', 'delivered', 'returned') then placed + interval '20 hours' end,
      case when s ->> 0 in ('delivered', 'returned') then placed + interval '3 days' end,
      case when s ->> 0 = 'returned' then placed + interval '6 days' end,
      case when s ->> 0 = 'cancelled' then placed + interval '2 days' end)
    returning id into oid;
    if (s ->> 4)::int = 0 then update public.orders set user_id = '00000000-0000-0000-0000-0000000000b1' where id = oid; end if;
    for it in select * from jsonb_array_elements(s -> 2) loop
      select id, name, price_cents into p from public.products where slug = it ->> 0;
      insert into public.order_items (order_id, product_id, product_name, size, qty, unit_cents)
      values (oid, p.id, p.name, it ->> 1, (it ->> 2)::int, p.price_cents);
    end loop;
    i := i + 1;
  end loop;
end $$;

-- Earlier paid history (60 days) for revenue charts, heatmap and the Kleinunternehmer card.
insert into public.orders (order_no, email, first_name, last_name, street, zip, city, country, subtotal_cents, discount_cents, shipping_cents, total_cents,
  status, payment_status, payment_method, placed_at, paid_at, shipped_at, delivered_at)
select 'TIC-2026-H' || lpad(g::text, 5, '0'), 'kunde' || (g % 40) || '@mail.de', 'Kunde', 'Nr ' || (g % 40), 'Weg 1', '10115', 'Berlin', 'DE',
  6989, 0, 0, 6989 + (g % 5) * 1000, 'delivered', 'paid', 'Card (Stripe)',
  now() - ((14 + g % 46) || ' days')::interval - (((g * 7) % 24) || ' hours')::interval,
  now() - ((14 + g % 46) || ' days')::interval - (((g * 7) % 24) || ' hours')::interval + interval '1 minute',
  now() - ((13 + g % 46) || ' days')::interval, now() - ((11 + g % 46) || ' days')::interval
from generate_series(1, 90) g;
insert into public.order_items (order_id, product_id, product_name, size, qty, unit_cents)
select o.id, p.id, p.name, (array['S','M','L','XL'])[1 + (abs(hashtext(o.order_no)) % 4)], 1, p.price_cents
from public.orders o
join lateral (select id, name, price_cents from public.products order by abs(hashtext(o.order_no || slug)) limit 1) p on true
where o.order_no like 'TIC-2026-H%';

-- Abandoned checkouts (1 h – 2 days old).
insert into public.checkouts (order_no, email, first_name, last_name, street, zip, city, country, items, subtotal_cents, shipping_cents, total_cents, status, created_at)
select 'TIC-2026-C' || x.k, x.email, x.f, x.l, 'Weg 1', '10115', 'Berlin', 'DE',
  jsonb_build_array(jsonb_build_object('product_id', p.id, 'name', p.name, 'size', x.size, 'qty', 1, 'unit_cents', p.price_cents)),
  p.price_cents, 519, p.price_cents + 519, 'open', now() - x.ago
from (values ('A1', 'felix@mail.de', 'Felix', 'Sommer', 'tic-heavyweight-hoodie', 'L', interval '2 hours'),
             ('A2', 'laura@mail.de', 'Laura', 'Neumann', 'till-i-collapse-piped-tracksuit', 'M', interval '5 hours'),
             ('A3', 'tim@mail.de', 'Tim', 'Krüger', 'tic-wide-sweatpants', 'L', interval '1 day'),
             ('A4', 'nina@mail.de', 'Nina', 'Vogel', 'tic-acid-wash-hoodie-grau', 'S', interval '2 days')) as x(k, email, f, l, slug, size, ago)
join public.products p on p.slug = x.slug;

-- A sold-out moment after drop 001 went live (for the drop comparison).
insert into public.stock_movements (variant_id, delta, stock_after, reason, at)
select v.id, -1, 0, 'order', now() - interval '30 days' + interval '19 hours'
from public.product_variants v join public.products p on p.id = v.product_id
where p.slug = 'tic-sweatshorts' and v.size = 'XL';
