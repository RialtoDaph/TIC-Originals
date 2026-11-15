-- Defaults matching the client decisions (Nov 2026): DE 4,95 €, EU 14,95 €, popup WELCOME10 (10 %).
alter table public.site_settings
  alter column ship_de_cents set default 495,
  alter column ship_intl_cents set default 1495,
  alter column popup_code set default 'WELCOME10',
  alter column popup_pct set default 10;
