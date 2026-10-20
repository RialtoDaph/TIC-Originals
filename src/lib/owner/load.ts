import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mapSettings, DEFAULT_SETTINGS } from '@/lib/catalog';
import { mapCode } from '@/lib/checkout';
import type { OActivity, OCart, ODrop, OOrder, OProduct, OwnerData } from './types';

type Row = Record<string, unknown>;

/** Start of today in Europe/Berlin as an ISO timestamp. */
export function berlinMidnight(now: Date) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);
  const utcGuess = new Date(day + 'T00:00:00Z');
  const offset = new Date(utcGuess.toLocaleString('en-US', { timeZone: 'Europe/Berlin' })).getTime() - new Date(utcGuess.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  return new Date(utcGuess.getTime() - offset).toISOString();
}

export function mapOrder(r: Row): OOrder {
  return {
    id: r.id as string,
    no: r.order_no as string,
    placedAt: r.placed_at as string,
    paidAt: (r.paid_at as string) ?? null,
    shippedAt: (r.shipped_at as string) ?? null,
    deliveredAt: (r.delivered_at as string) ?? null,
    returnedAt: (r.returned_at as string) ?? null,
    refundedAt: (r.refunded_at as string) ?? null,
    remindedAt: (r.reminded_at as string) ?? null,
    firstName: r.first_name as string,
    lastName: r.last_name as string,
    email: r.email as string,
    street: r.street as string,
    extra: r.extra as string,
    zip: r.zip as string,
    city: r.city as string,
    country: r.country as string,
    phone: r.phone as string,
    subtotalCents: r.subtotal_cents as number,
    discountCode: (r.discount_code as string) ?? null,
    discountCents: r.discount_cents as number,
    shippingCents: r.shipping_cents as number,
    totalCents: r.total_cents as number,
    refundedCents: r.refunded_cents as number,
    status: r.status as OOrder['status'],
    payment: r.payment_status as OOrder['payment'],
    method: r.payment_method as string,
    carrier: r.carrier as string,
    tracking: r.tracking as string,
    note: r.note as string,
    flags: (r.flags as string[]) ?? [],
    invoiceNo: (r.invoice_no as string) ?? null,
    items: ((r.order_items as Row[]) ?? []).map((i) => ({
      productId: (i.product_id as string) ?? null,
      name: i.product_name as string,
      size: i.size as string,
      qty: i.qty as number,
      unitCents: i.unit_cents as number,
    })),
  };
}

function check<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

/**
 * Everything the dashboard needs, read with the owner's own session (RLS enforces is_owner()).
 * The catalogue and order volume of a single-brand shop are small, so this loads whole tables;
 * if order history grows into the tens of thousands, move the aggregations into SQL views.
 */
export async function loadOwnerData(supabase: SupabaseClient): Promise<OwnerData> {
  const now = new Date();
  const cartWindowStart = new Date(now.getTime() - 7 * 864e5).toISOString();
  const cartWindowEnd = new Date(now.getTime() - 3600e3).toISOString();
  const year = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric' }).format(now);

  const [orders, products, waitlist, restock, codes, bundles, checkouts, drops, settings, notif, activity, vip, kuAck] = await Promise.all([
    supabase.from('orders').select('*, order_items(*)').is('deleted_at', null).order('placed_at', { ascending: false }),
    supabase.from('products').select('*, product_variants(id, size, stock, sort_order)').order('sort_order').order('created_at'),
    supabase.from('waitlist').select('product_id, size').is('notified_at', null),
    supabase.from('restock_marks').select('product_id'),
    supabase.from('discount_codes').select('*').order('created_at', { ascending: false }),
    supabase.from('bundles').select('*').order('created_at'),
    supabase
      .from('checkouts')
      .select('id, email, first_name, last_name, items, total_cents, created_at, reminder_sent_at, status')
      .in('status', ['open', 'failed'])
      .gte('created_at', cartWindowStart)
      .lte('created_at', cartWindowEnd)
      .order('created_at', { ascending: false }),
    supabase.from('drops').select('*').order('created_at', { ascending: false }).limit(10),
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('owner_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('activity_log').select('*').order('at', { ascending: false }).limit(60),
    supabase.from('vip_sends').select('email'),
    supabase.from('activity_log').select('id').eq('task_key', 'ku').is('undone_at', null).gte('at', `${year}-01-01`).limit(1),
  ]);

  const orderList = check(orders).map(mapOrder);

  const waitMap = new Map<string, Record<string, number>>();
  for (const w of check(waitlist) as Row[]) {
    const m = waitMap.get(w.product_id as string) ?? {};
    m[w.size as string] = (m[w.size as string] ?? 0) + 1;
    waitMap.set(w.product_id as string, m);
  }
  const ordered = new Set((check(restock) as Row[]).map((r) => r.product_id as string));
  const productList: OProduct[] = (check(products) as Row[]).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    category: r.category as string,
    priceCents: r.price_cents as number,
    images: (r.images as string[]) ?? [],
    visible: r.visible as boolean,
    lowStock: r.low_stock_threshold as number,
    variants: ((r.product_variants as Row[]) ?? [])
      .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
      .map((v) => ({ id: v.id as string, size: v.size as string, stock: v.stock as number })),
    waitlist: waitMap.get(r.id as string) ?? {},
    restockOrdered: ordered.has(r.id as string),
  }));

  // Abandoned carts: unpaid checkouts (1 h – 7 d old) whose email has not ordered since.
  const orderedEmails = new Map<string, number>();
  for (const o of orderList) {
    const t = new Date(o.placedAt).getTime();
    const k = o.email.toLowerCase();
    orderedEmails.set(k, Math.max(orderedEmails.get(k) ?? 0, t));
  }
  const seen = new Set<string>();
  const carts: OCart[] = [];
  for (const c of check(checkouts) as Row[]) {
    const email = (c.email as string).toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    if ((orderedEmails.get(email) ?? 0) > new Date(c.created_at as string).getTime()) continue;
    const items = (c.items as { product_id: string; name: string; size: string; qty: number }[]).map((i) => ({
      productId: i.product_id,
      name: i.name,
      size: i.size,
      qty: i.qty,
    }));
    carts.push({
      id: c.id as string,
      name: `${c.first_name} ${c.last_name}`.trim(),
      email: c.email as string,
      createdAt: c.created_at as string,
      items,
      valueCents: c.total_cents as number,
      reminded: !!c.reminder_sent_at,
    });
  }

  const dropRows = check(drops) as Row[];
  const dropList: ODrop[] = await Promise.all(
    dropRows.map(async (d) => {
      let firstSoldOutAt: string | null = null;
      if (new Date(d.live_at as string) <= now) {
        const { data } = await supabase
          .from('stock_movements')
          .select('at')
          .eq('stock_after', 0)
          .eq('reason', 'order')
          .gte('at', d.live_at as string)
          .order('at')
          .limit(1);
        firstSoldOutAt = (data?.[0]?.at as string) ?? null;
      }
      return {
        id: d.id as string,
        name: d.name as string,
        liveAt: d.live_at as string,
        lockShop: d.lock_shop as boolean,
        snapshot: (d.stock_snapshot as Record<string, number>) ?? null,
        firstSoldOutAt,
      };
    }),
  );

  const n = check(notif) as Row | null;
  const activityRows = check(activity) as Row[];
  const latestUndoable = activityRows.find((a) => a.task_key && !a.undone_at);
  const act: OActivity[] = activityRows
    .filter((a) => !a.undone_at)
    .map((a) => ({
      id: a.id as number,
      at: a.at as string,
      text: a.text as string,
      taskKey: (a.task_key as string) ?? null,
      canUndo: !!a.undo && a.id === latestUndoable?.id,
    }));

  return {
    now: now.toISOString(),
    orders: orderList,
    products: productList,
    codes: (check(codes) as Row[]).map(mapCode),
    bundles: (check(bundles) as Row[]).map((b) => ({
      id: b.id as string,
      name: b.name as string,
      summary: b.summary as string,
      normalCents: b.normal_cents as number,
      priceCents: b.price_cents as number,
      active: b.active as boolean,
    })),
    carts,
    drops: dropList,
    settings: settings.data ? mapSettings(settings.data) : DEFAULT_SETTINGS,
    notif: {
      tg: !!n?.notify_telegram,
      tgId: (n?.telegram_chat as string) ?? '',
      wa: !!n?.notify_whatsapp,
      waNo: (n?.whatsapp_no as string) ?? '',
      events: (n?.notify_events as string[]) ?? [],
    },
    activity: act,
    vipSent: (check(vip) as Row[]).map((v) => (v.email as string).toLowerCase()),
    kuAcked: (check(kuAck) as Row[]).length > 0,
  };
}
