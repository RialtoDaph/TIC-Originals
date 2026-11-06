-- Per-client request counters for the public endpoints, order flags set by the webhook,
-- and fixed search paths for the two remaining functions.

create table public.rate_limits (
  key text primary key,
  hits integer not null default 1,
  expires_at timestamptz not null
);
create index rate_limits_expires_idx on public.rate_limits (expires_at);
alter table public.rate_limits enable row level security;

-- Returns true while the key is within p_limit hits for the current window.
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  total integer;
begin
  delete from public.rate_limits where expires_at < now();
  insert into public.rate_limits (key, hits, expires_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set hits = public.rate_limits.hits + 1
  returning hits into total;
  return total <= p_limit;
end;
$$;

-- Adds a flag to an order once.
create or replace function public.flag_order(p_order_id uuid, p_flag text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders set flags = array_append(array_remove(flags, p_flag), p_flag) where id = p_order_id;
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.flag_order(uuid, text) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
grant execute on function public.flag_order(uuid, text) to service_role;

alter function public.touch_updated_at() set search_path = public;
alter function public.berlin_timestamp(text, text) set search_path = public;
