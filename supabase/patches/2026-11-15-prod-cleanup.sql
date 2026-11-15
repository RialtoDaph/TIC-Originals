-- Audit 15.11.2026. Run on production together with 2026-11-10-client-catalogue.sql
-- (that one renames the Drop 002 set and hides the skirt + crop top). Idempotent.
begin;

-- Old popup code from the first version: no longer advertised, switch it off.
update public.discount_codes set active = false where code = 'TIC15';

-- Codes agreed with the client (no-op if they already exist).
insert into public.discount_codes (code, is_percent, value, first_order_only, active)
values ('WELCOME10', true, 10, true, true)
on conflict (code) do nothing;
insert into public.discount_codes (code, is_percent, value, valid_until, active)
values ('NOBLACKFRIDAY', true, 1, date '2026-11-30', true)
on conflict (code) do nothing;

-- Popup advertises WELCOME10.
update public.site_settings set popup_code = 'WELCOME10', popup_pct = 10 where id = 1;

commit;

-- Check afterwards:
-- select code, value, active, valid_until from public.discount_codes order by code;
-- select slug, name, visible from public.products where slug in ('pleated-skirt-rose','tc-crop-tee-weiss') or model like 'Chosen1%';
