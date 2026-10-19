-- Database functions used by the checkout webhook, the owner dashboard and order tracking.

-- Random, non-sequential order number: TIC-<year>-XXXXXX (no 0/O/1/I to avoid confusion).
create or replace function public.gen_order_no()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
begin
  loop
    candidate := 'TIC-' || to_char(now() at time zone 'Europe/Berlin', 'YYYY') || '-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.checkouts where order_no = candidate)
          and not exists (select 1 from public.orders where order_no = candidate);
  end loop;
  return candidate;
end;
$$;

-- Take stock for an order's items. Never goes below zero; flags the order when it oversold.
create or replace function public.take_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it record;
  v record;
  oversold boolean := false;
begin
  for it in select product_id, size, qty from public.order_items where order_id = p_order_id loop
    select id, stock into v from public.product_variants
      where product_id = it.product_id and size = it.size for update;
    if not found then
      oversold := true;
      continue;
    end if;
    if v.stock < it.qty then
      oversold := true;
    end if;
    update public.product_variants set stock = greatest(stock - it.qty, 0) where id = v.id;
    insert into public.stock_movements (variant_id, delta, stock_after, reason, ref)
      values (v.id, -least(it.qty, v.stock), greatest(v.stock - it.qty, 0), 'order', p_order_id::text);
  end loop;
  if oversold then
    update public.orders set flags = array_append(array_remove(flags, 'oversold'), 'oversold') where id = p_order_id;
  end if;
end;
$$;

-- Put an order's items back into stock (failed SEPA payment, cancellation, resellable return).
create or replace function public.return_stock(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it record;
  v record;
begin
  for it in select product_id, size, qty from public.order_items where order_id = p_order_id loop
    update public.product_variants set stock = stock + it.qty
      where product_id = it.product_id and size = it.size
      returning id, stock into v;
    if found then
      insert into public.stock_movements (variant_id, delta, stock_after, reason, ref)
        values (v.id, it.qty, v.stock, p_reason, p_order_id::text);
    end if;
  end loop;
end;
$$;

-- Called by the Stripe webhook (service role only). Creates the order the first time a
-- payment is processing (SEPA) or succeeds, and keeps it in sync afterwards.
-- Returns {order_id, event} where event is one of: created_pending, created_paid, paid, failed, noop.
create or replace function public.finalize_checkout(p_payment_intent text, p_status text, p_method text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.checkouts;
  o public.orders;
  new_id uuid;
  it jsonb;
begin
  select * into c from public.checkouts where payment_intent_id = p_payment_intent for update;
  if not found then
    raise exception 'unknown payment intent %', p_payment_intent;
  end if;
  select * into o from public.orders where checkout_id = c.id for update;

  if p_status = 'failed' then
    if c.status <> 'succeeded' then
      update public.checkouts set status = 'failed' where id = c.id;
    end if;
    if o.id is not null and o.payment_status = 'pending' then
      update public.orders
        set status = 'cancelled', payment_status = 'failed', cancelled_at = now()
        where id = o.id;
      perform public.return_stock(o.id, 'cancel');
      if o.discount_code is not null then
        update public.discount_codes set used_count = greatest(used_count - 1, 0) where code = o.discount_code;
      end if;
      return jsonb_build_object('order_id', o.id, 'event', 'failed');
    end if;
    return jsonb_build_object('order_id', o.id, 'event', 'noop');
  end if;

  if p_status not in ('processing', 'succeeded') then
    raise exception 'unsupported status %', p_status;
  end if;

  if o.id is not null then
    if p_status = 'succeeded' and o.payment_status = 'pending' then
      update public.orders
        set status = 'confirmed', payment_status = 'paid', paid_at = now(),
            payment_method = coalesce(nullif(p_method, ''), payment_method)
        where id = o.id;
      update public.checkouts set status = 'succeeded' where id = c.id;
      return jsonb_build_object('order_id', o.id, 'event', 'paid');
    end if;
    return jsonb_build_object('order_id', o.id, 'event', 'noop');
  end if;

  insert into public.orders (
    order_no, checkout_id, user_id, email, first_name, last_name, street, extra, zip, city, country, phone, lang,
    subtotal_cents, discount_code, discount_cents, shipping_cents, total_cents,
    status, payment_status, payment_method, payment_intent_id, paid_at
  ) values (
    c.order_no, c.id, c.user_id, c.email, c.first_name, c.last_name, c.street, c.extra, c.zip, c.city, c.country, c.phone, c.lang,
    c.subtotal_cents, c.discount_code, c.discount_cents, c.shipping_cents, c.total_cents,
    case when p_status = 'succeeded' then 'confirmed' else 'pending' end,
    case when p_status = 'succeeded' then 'paid' else 'pending' end,
    p_method, p_payment_intent,
    case when p_status = 'succeeded' then now() else null end
  ) returning id into new_id;

  for it in select * from jsonb_array_elements(c.items) loop
    insert into public.order_items (order_id, product_id, product_name, size, qty, unit_cents)
    values (new_id, (it ->> 'product_id')::uuid, it ->> 'name', it ->> 'size', (it ->> 'qty')::int, (it ->> 'unit_cents')::int);
  end loop;

  perform public.take_stock(new_id);

  if c.discount_code is not null then
    update public.discount_codes set used_count = used_count + 1 where code = c.discount_code;
  end if;

  update public.checkouts set status = case when p_status = 'succeeded' then 'succeeded' else 'processing' end where id = c.id;

  return jsonb_build_object('order_id', new_id, 'event', case when p_status = 'succeeded' then 'created_paid' else 'created_pending' end);
end;
$$;

-- Owner: add or remove stock for one variant and log the movement.
create or replace function public.adjust_stock(p_variant_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stock integer;
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.product_variants set stock = greatest(stock + p_delta, 0)
    where id = p_variant_id returning stock into new_stock;
  insert into public.stock_movements (variant_id, delta, stock_after, reason)
    values (p_variant_id, p_delta, new_stock, 'manual');
  return new_stock;
end;
$$;

-- Owner: give an order a sequential invoice number (RE-<year>-0001) the first time an invoice is created.
create or replace function public.assign_invoice_no(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  no text;
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select invoice_no into no from public.orders where id = p_order_id for update;
  if no is null then
    no := 'RE-' || to_char(now() at time zone 'Europe/Berlin', 'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 4, '0');
    update public.orders set invoice_no = no where id = p_order_id;
  end if;
  return no;
end;
$$;

-- Owner: mark an order cancelled/returned items as resellable again.
create or replace function public.owner_return_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.return_stock(p_order_id, 'return');
end;
$$;

-- Public order tracking by order number. Returns no personal data (no name, address or email).
create or replace function public.track_order(p_order_no text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'order_no', o.order_no,
    'status', o.status,
    'payment_status', o.payment_status,
    'carrier', o.carrier,
    'tracking', o.tracking,
    'placed_at', o.placed_at,
    'paid_at', o.paid_at,
    'shipped_at', o.shipped_at,
    'delivered_at', o.delivered_at,
    'total_cents', o.total_cents,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.product_name, 'size', i.size, 'qty', i.qty, 'unit_cents', i.unit_cents))
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.order_no = upper(trim(p_order_no)) and o.deleted_at is null;
$$;

-- Lock down function execution.
revoke execute on function public.gen_order_no() from public, anon, authenticated;
revoke execute on function public.take_stock(uuid) from public, anon, authenticated;
revoke execute on function public.return_stock(uuid, text) from public, anon, authenticated;
revoke execute on function public.finalize_checkout(text, text, text) from public, anon, authenticated;
revoke execute on function public.adjust_stock(uuid, integer) from public, anon;
revoke execute on function public.assign_invoice_no(uuid) from public, anon;
revoke execute on function public.owner_return_stock(uuid) from public, anon;
grant execute on function public.adjust_stock(uuid, integer) to authenticated;
grant execute on function public.assign_invoice_no(uuid) to authenticated;
grant execute on function public.owner_return_stock(uuid) to authenticated;
grant execute on function public.track_order(text) to anon, authenticated;
grant execute on function public.gen_order_no() to service_role;
grant execute on function public.finalize_checkout(text, text, text) to service_role;
