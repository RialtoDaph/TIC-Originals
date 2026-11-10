-- Base configuration (safe to keep in production). Values match the design handoff.
insert into public.site_settings (id, free_ship_cents, ship_de_cents, ship_intl_cents, usd_rate,
  popup_enabled, popup_code, popup_pct, popup_until, ann_left, ann_right)
values (1, 8000, 495, 1495, 1.10, true, 'WELCOME10', 10, '',
  array['@tillicollapseoriginals · 24K Follower', 'Kostenloser Versand in DE ab 80 €', 'Sicher bezahlen · Stripe & PayPal'],
  array['Drop 001 · Out Now', 'Versand am selben Werktag', '14 Tage Rückgabe'])
on conflict (id) do nothing;

insert into public.owner_settings (id) values (1) on conflict (id) do nothing;

-- The welcome code advertised by the storefront popup (10 % on the first order).
insert into public.discount_codes (code, is_percent, value, first_order_only, active)
values ('WELCOME10', true, 10, true, true)
on conflict (code) do nothing;

-- Anti-Black-Friday code: 1 % on everything for all of November, no minimum.
insert into public.discount_codes (code, is_percent, value, valid_until, active)
values ('NOBLACKFRIDAY', true, 1, date '2026-11-30', true)
on conflict (code) do nothing;

-- Next drop (edit in the dashboard under Promo → Drop schedule).
insert into public.drops (name, live_at, lock_shop)
select '002', timestamptz '2026-10-24 18:00 Europe/Berlin', false
where not exists (select 1 from public.drops);
