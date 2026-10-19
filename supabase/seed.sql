-- Base configuration (safe to keep in production). Values match the design handoff.
insert into public.site_settings (id, free_ship_cents, ship_de_cents, ship_intl_cents, usd_rate,
  popup_enabled, popup_code, popup_pct, popup_until, ann_left, ann_right)
values (1, 8000, 519, 1419, 1.10, true, 'TIC15', 15, '31.10.2026',
  array['@tillicollapseoriginals · 24K Follower', 'Kostenloser Versand ab 80 €', 'Sicher bezahlen · Stripe & PayPal'],
  array['Drop 001 · Out Now', 'Versand am selben Werktag', '14 Tage Rückgabe'])
on conflict (id) do nothing;

insert into public.owner_settings (id) values (1) on conflict (id) do nothing;

-- The welcome code advertised by the storefront popup.
insert into public.discount_codes (code, is_percent, value, first_order_only, active)
values ('TIC15', true, 15, true, true)
on conflict (code) do nothing;

-- Next drop (edit in the dashboard under Promo → Drop schedule).
insert into public.drops (name, live_at, lock_shop)
select '002', timestamptz '2026-10-24 18:00 Europe/Berlin', false
where not exists (select 1 from public.drops);
