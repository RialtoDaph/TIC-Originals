-- Newsletter double opt-in + one-click unsubscribe.
-- token: secret in the confirm/unsubscribe links. confirmation_sent_at: throttles re-sends.
alter table public.newsletter_subscribers
  add column if not exists token uuid not null default gen_random_uuid(),
  add column if not exists confirmation_sent_at timestamptz;

create unique index if not exists newsletter_subscribers_token_key on public.newsletter_subscribers (token);

-- Subscribers that existed before double opt-in never confirmed: they stay unconfirmed (confirmed_at is null).
