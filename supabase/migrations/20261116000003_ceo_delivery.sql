-- "Delivery by CEO": shipping option where the CEO hand-delivers the parcel (no DHL label).
-- The checkout stores the chosen carrier ('DHL' or 'CEO') and finalize_checkout copies it to the order.
alter table public.checkouts add column if not exists carrier text not null default 'DHL';

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
    subtotal_cents, discount_code, discount_cents, shipping_cents, total_cents, carrier,
    status, payment_status, payment_method, payment_intent_id, paid_at
  ) values (
    c.order_no, c.id, c.user_id, c.email, c.first_name, c.last_name, c.street, c.extra, c.zip, c.city, c.country, c.phone, c.lang,
    c.subtotal_cents, c.discount_code, c.discount_cents, c.shipping_cents, c.total_cents, c.carrier,
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
