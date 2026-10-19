import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from './email';
import { notifyOwner } from './notify';
import { fmtCents } from './format';
import { orderConfirmation, paymentFailedEmail, type EmailItem, type EmailOrder } from '@/i18n/emails';
import type { Lang } from './types';

export async function loadOrder(admin: SupabaseClient, orderId: string) {
  const { data: order, error } = await admin.from('orders').select('*, order_items(*)').eq('id', orderId).single();
  if (error) throw error;
  return order as EmailOrder & { id: string; email: string; lang: Lang; user_id: string | null; checkout_id: string | null; order_items: (EmailItem & { product_id: string | null })[] };
}

/** Side effects after the webhook created or changed an order. Each step is best-effort. */
export async function afterOrderEvent(admin: SupabaseClient, orderId: string, event: string) {
  const order = await loadOrder(admin, orderId);
  const lang: Lang = order.lang === 'en' ? 'en' : 'de';

  if (event === 'created_paid' || event === 'created_pending') {
    const mail = orderConfirmation(order, order.order_items, lang, event === 'created_pending');
    await sendEmail({ to: order.email, ...mail });
    const items = order.order_items.reduce((a, i) => a + i.qty, 0);
    await notifyOwner('order', `🛍 Neue Bestellung ${order.order_no} · ${order.first_name} ${order.last_name} · ${items} Artikel · ${fmtCents(order.total_cents, 'de')}`);
    await notifyLowStock(admin, order.order_items.map((i) => i.product_id).filter(Boolean) as string[]);
    await rememberCustomer(admin, order);
  }
  if (event === 'failed') {
    await sendEmail({ to: order.email, ...paymentFailedEmail(order, lang) });
  }
}

async function notifyLowStock(admin: SupabaseClient, productIds: string[]) {
  if (!productIds.length) return;
  const { data } = await admin.from('products').select('name, low_stock_threshold, product_variants(size, stock)').in('id', productIds);
  const low = (data ?? []).flatMap((p) =>
    (p.product_variants as { size: string; stock: number }[])
      .filter((v) => v.stock <= p.low_stock_threshold)
      .map((v) => `${p.name} · ${v.size}: ${v.stock === 0 ? 'ausverkauft' : v.stock + ' übrig'}`),
  );
  if (low.length) await notifyOwner('stock', `📦 Niedriger Bestand\n${low.join('\n')}`);
}

/** Save the shipping address for signed-in customers and record newsletter consent from checkout. */
async function rememberCustomer(admin: SupabaseClient, order: Awaited<ReturnType<typeof loadOrder>>) {
  if (order.user_id) {
    const { count } = await admin.from('addresses').select('id', { count: 'exact', head: true }).eq('user_id', order.user_id);
    if (!count) {
      await admin.from('addresses').insert({
        user_id: order.user_id,
        first_name: order.first_name,
        last_name: order.last_name,
        street: order.street,
        extra: order.extra,
        zip: order.zip,
        city: order.city,
        country: order.country,
        phone: (order as unknown as { phone: string }).phone ?? '',
        is_default: true,
      });
    }
  }
  if (order.checkout_id) {
    const { data: c } = await admin.from('checkouts').select('newsletter, lang').eq('id', order.checkout_id).maybeSingle();
    if (c?.newsletter) {
      await admin
        .from('newsletter_subscribers')
        .upsert({ email: order.email.toLowerCase(), source: 'checkout', lang: c.lang }, { onConflict: 'email', ignoreDuplicates: true });
    }
  }
}
