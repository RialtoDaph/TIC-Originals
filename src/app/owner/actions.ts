'use server';

// Owner dashboard mutations. Every action re-checks the owner role server-side (requireOwner)
// and runs with the owner's session, so row level security applies as a second guard.

import { refresh } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireOwner } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { notifyOwner, type NotifyResult } from '@/lib/notify';
import { stripe } from '@/lib/stripe';
import { fmtCents } from '@/lib/format';
import { serverEnv } from '@/lib/env';
import { invoicePdf } from '@/lib/invoice';
import { mapOrder } from '@/lib/owner/load';
import { CATEGORIES, slugify } from '@/lib/categories';
import { cartReminderEmail, invoiceEmail, paymentReminderEmail, refundEmail, shippedEmail, vipEmail, type EmailOrder } from '@/i18n/emails';
import type { Lang } from '@/lib/types';

export type Result = { ok: true; emailed?: number; emailOff?: boolean; data?: unknown } | { ok: false; error: string };

const VIP_CODE = 'VIP20';
const VIP_PCT = 20;
const emailConfigured = () => !!serverEnv.resendApiKey();

async function owner() {
  return requireOwner();
}

async function log(supabase: SupabaseClient, actor: string, text: string, taskKey: string | null = null, undo: unknown = null) {
  await supabase.from('activity_log').insert({ actor, text, task_key: taskKey, undo });
}

function fail(e: unknown): Result {
  console.error('[owner action]', e);
  return { ok: false, error: e instanceof Error ? e.message : 'failed' };
}

async function wrap(fn: () => Promise<Result>): Promise<Result> {
  try {
    const r = await fn();
    refresh();
    return r;
  } catch (e) {
    return fail(e);
  }
}

async function loadOrders(supabase: SupabaseClient, ids: string[]) {
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').in('id', ids);
  if (error) throw error;
  return (data ?? []) as (EmailOrder & Record<string, unknown> & { id: string; email: string; lang: Lang })[];
}

// --- Orders -------------------------------------------------------------------

export async function shipOrders(ids: string[], taskKey: string | null): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const orders = (await loadOrders(supabase, ids)).filter(
      (o) => o.payment_status === 'paid' && (o.status === 'confirmed' || o.status === 'processing'),
    );
    if (!orders.length) return { ok: true, emailed: 0 };
    const prev = orders.map((o) => ({ id: o.id, status: o.status }));
    const { error } = await supabase
      .from('orders')
      .update({ status: 'shipped', shipped_at: new Date().toISOString() })
      .in('id', orders.map((o) => o.id));
    if (error) throw error;
    // TODO(dhl): create shipping labels through the DHL Parcel DE API and store the tracking number.
    let emailed = 0;
    for (const o of orders) {
      const r = await sendEmail({ to: o.email, ...shippedEmail({ ...o, carrier: o.carrier as string, tracking: o.tracking as string }, o.lang === 'en' ? 'en' : 'de') });
      if (r.sent) emailed++;
    }
    const text = orders.length === 1 ? `Shipped ${o0(orders).order_no}` : `Shipped ${orders.length} orders`;
    await log(supabase, user.id, text, taskKey, { type: 'ship', prev });
    return { ok: true, emailed, emailOff: !emailConfigured() };
  });
}
const o0 = <T,>(a: T[]) => a[0];

export async function markDelivered(id: string): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'shipped')
      .select('order_no');
    if (error) throw error;
    if (data?.[0]) await log(supabase, user.id, `${data[0].order_no} marked delivered`, null, { type: 'status', id, status: 'shipped', field: 'delivered_at' });
    return { ok: true };
  });
}

export async function markReturned(id: string): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'returned', returned_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['shipped', 'delivered'])
      .select('order_no, status');
    if (error) throw error;
    if (data?.[0]) await log(supabase, user.id, `${data[0].order_no} marked as returned`);
    return { ok: true };
  });
}

/** Refunds the outstanding amount through Stripe. Returned items go back into stock. Cannot be undone. */
export async function refundOrder(id: string, taskKey: string | null): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const [o] = await loadOrders(supabase, [id]);
    if (!o) return { ok: false, error: 'not found' };
    const amount = (o.total_cents as number) - (o.refunded_cents as number);
    if (amount <= 0 || o.payment_status !== 'paid') return { ok: false, error: 'nothing to refund' };
    if (o.payment_intent_id) {
      await stripe().refunds.create({ payment_intent: o.payment_intent_id as string, amount }, { idempotencyKey: `refund-${o.id}-${amount}` });
    }
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'refunded', refunded_cents: o.total_cents, refunded_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    if (o.status === 'returned') await supabase.rpc('owner_return_stock', { p_order_id: id });
    const r = await sendEmail({ to: o.email, ...refundEmail(o, amount, o.lang === 'en' ? 'en' : 'de') });
    await notifyOwner('refund', `↩️ Erstattung ${fmtCents(amount, 'de')} · ${o.order_no}`);
    await log(supabase, user.id, `Refunded ${fmtCents(amount, 'en')} to ${o.first_name} ${o.last_name}`, taskKey, null);
    return { ok: true, emailed: r.sent ? 1 : 0, emailOff: !emailConfigured() };
  });
}

export async function remindPayment(id: string, taskKey: string | null): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const [o] = await loadOrders(supabase, [id]);
    if (!o || o.payment_status !== 'pending') return { ok: false, error: 'not pending' };
    const r = await sendEmail({ to: o.email, ...paymentReminderEmail(o, o.lang === 'en' ? 'en' : 'de') });
    await supabase.from('orders').update({ reminded_at: new Date().toISOString() }).eq('id', id);
    await log(supabase, user.id, `Reminded ${o.first_name} ${o.last_name} to pay`, taskKey, null);
    return { ok: true, emailed: r.sent ? 1 : 0, emailOff: !emailConfigured() };
  });
}

export async function updateOrderFields(id: string, patch: { carrier?: string; tracking?: string; note?: string }): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await owner();
    const clean: Record<string, string> = {};
    if (typeof patch.carrier === 'string') clean.carrier = patch.carrier.slice(0, 40);
    if (typeof patch.tracking === 'string') clean.tracking = patch.tracking.trim().slice(0, 80);
    if (typeof patch.note === 'string') clean.note = patch.note.slice(0, 2000);
    const { error } = await supabase.from('orders').update(clean).eq('id', id);
    if (error) throw error;
    return { ok: true };
  });
}

/** Hides the order from the dashboard. The row is kept: paid orders must stay in the books (GoBD). */
export async function deleteOrder(id: string): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const { data, error } = await supabase.from('orders').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('order_no');
    if (error) throw error;
    await log(supabase, user.id, `Deleted order ${data?.[0]?.order_no ?? ''}`);
    return { ok: true };
  });
}

export async function emailInvoice(id: string): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const { data: no, error } = await supabase.rpc('assign_invoice_no', { p_order_id: id });
    if (error) throw error;
    const [raw] = await loadOrders(supabase, [id]);
    const order = mapOrder(raw);
    const pdf = await invoicePdf(order, no as string, new Date());
    const r = await sendEmail({
      to: order.email,
      ...invoiceEmail(raw, no as string, raw.lang === 'en' ? 'en' : 'de'),
      attachments: [{ filename: `Rechnung-${no}.pdf`, content: pdf }],
    });
    await log(supabase, user.id, `Invoice ${no} emailed to ${order.email}`);
    return { ok: true, emailed: r.sent ? 1 : 0, emailOff: !emailConfigured() };
  });
}

// --- Today tasks --------------------------------------------------------------

export async function setRestockOrdered(productIds: string[], on: boolean, taskKey: string | null): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    if (on) {
      const { error } = await supabase.from('restock_marks').upsert(productIds.map((product_id) => ({ product_id })));
      if (error) throw error;
      await log(supabase, user.id, `Restock ordered for ${productIds.length} products`, taskKey, { type: 'restock', productIds });
    } else {
      const { error } = await supabase.from('restock_marks').delete().in('product_id', productIds);
      if (error) throw error;
    }
    return { ok: true };
  });
}

export async function sendCartReminders(checkoutIds: string[], taskKey: string | null): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const { data, error } = await supabase.from('checkouts').select('id, email, first_name, items, lang').in('id', checkoutIds).is('reminder_sent_at', null);
    if (error) throw error;
    let emailed = 0;
    for (const c of data ?? []) {
      const r = await sendEmail({ to: c.email, ...cartReminderEmail(c.first_name, c.items, c.lang === 'en' ? 'en' : 'de') });
      if (r.sent) emailed++;
    }
    await supabase.from('checkouts').update({ reminder_sent_at: new Date().toISOString() }).in('id', (data ?? []).map((c) => c.id));
    await log(supabase, user.id, `Sent ${data?.length ?? 0} cart reminders`, taskKey, null);
    return { ok: true, emailed, emailOff: !emailConfigured() };
  });
}

export async function ackKleinunternehmer(): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    await log(supabase, user.id, 'Checked Kleinunternehmer limit', 'ku', { type: 'noop' });
    return { ok: true };
  });
}

/** Reverts the latest undoable action (shipping, restock marks, acknowledgements). */
export async function undoActivity(activityId: number): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await owner();
    const { data: a, error } = await supabase.from('activity_log').select('*').eq('id', activityId).is('undone_at', null).maybeSingle();
    if (error) throw error;
    if (!a?.undo) return { ok: false, error: 'cannot undo' };
    const u = a.undo as { type: string; prev?: { id: string; status: string }[]; productIds?: string[]; id?: string; status?: string; field?: string };
    if (u.type === 'ship') {
      for (const p of u.prev ?? []) {
        await supabase.from('orders').update({ status: p.status, shipped_at: null }).eq('id', p.id).eq('status', 'shipped');
      }
    } else if (u.type === 'restock') {
      await supabase.from('restock_marks').delete().in('product_id', u.productIds ?? []);
    } else if (u.type === 'status' && u.id && u.status && u.field) {
      await supabase.from('orders').update({ status: u.status, [u.field]: null }).eq('id', u.id);
    }
    await supabase.from('activity_log').update({ undone_at: new Date().toISOString() }).eq('id', activityId);
    return { ok: true };
  });
}

// --- Customers ------------------------------------------------------------------

export async function sendVipCode(email: string, name: string): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    await supabase.from('discount_codes').upsert({ code: VIP_CODE, is_percent: true, value: VIP_PCT, active: true }, { onConflict: 'code', ignoreDuplicates: true });
    const { data: last } = await supabase.from('orders').select('first_name, lang').ilike('email', email).order('placed_at', { ascending: false }).limit(1);
    const lang: Lang = last?.[0]?.lang === 'en' ? 'en' : 'de';
    const r = await sendEmail({ to: email, ...vipEmail(last?.[0]?.first_name ?? name, VIP_CODE, VIP_PCT, lang) });
    await supabase.from('vip_sends').upsert({ email: email.toLowerCase() });
    await log(supabase, user.id, `${VIP_CODE} sent to ${name}`);
    return { ok: true, emailed: r.sent ? 1 : 0, emailOff: !emailConfigured() };
  });
}

// --- Products -------------------------------------------------------------------

export interface ProductDraft {
  id?: string;
  name: string;
  category: string;
  price: string;
  low: string;
  stock: Record<string, string>;
}

const euroToCents = (v: string) => Math.round(Number(String(v).replace(',', '.')) * 100);

export async function saveProduct(d: ProductDraft): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const name = d.name.trim();
    if (!name) return { ok: false, error: 'name' };
    const price = euroToCents(d.price || '0');
    if (!Number.isFinite(price) || price < 0) return { ok: false, error: 'price' };
    const low = d.low === '' ? 3 : Math.max(0, Math.floor(Number(d.low)));
    const catLabel = d.category.trim();
    const category = CATEGORIES.find((c) => c.label.toLowerCase() === catLabel.toLowerCase())?.slug ?? slugify(catLabel);
    let productId = d.id;
    if (productId) {
      const { error } = await supabase.from('products').update({ name, category, price_cents: price, low_stock_threshold: Number.isFinite(low) ? low : 3 }).eq('id', productId);
      if (error) throw error;
    } else {
      // Slugs must not collide with category routes (/shop/<category>) or existing products.
      let slug = slugify(name) || 'product';
      const reserved = new Set(CATEGORIES.map((c) => c.slug));
      for (let i = 2; reserved.has(slug) || (await supabase.from('products').select('id').eq('slug', slug).maybeSingle()).data; i++) slug = `${slugify(name)}-${i}`;
      // TODO(images): add an image upload (Supabase Storage) to the product modal; until then new products show a placeholder.
      const { data, error } = await supabase.from('products').insert({ slug, name, category, price_cents: price, low_stock_threshold: low, sort_order: 1000 }).select('id').single();
      if (error) throw error;
      productId = data.id as string;
    }
    for (const [size, q] of Object.entries(d.stock)) {
      const stock = Math.max(0, Math.floor(Number(q) || 0));
      const { data: v } = await supabase.from('product_variants').select('id, stock').eq('product_id', productId).eq('size', size).maybeSingle();
      if (v) {
        if (v.stock !== stock) await supabase.rpc('adjust_stock', { p_variant_id: v.id, p_delta: stock - v.stock });
      } else {
        await supabase.from('product_variants').insert({ product_id: productId, size, stock, sort_order: ['S', 'M', 'L', 'XL'].indexOf(size) });
      }
    }
    await log(supabase, user.id, d.id ? `Updated ${name}` : `Added ${name}`);
    return { ok: true };
  });
}

export async function setProductVisible(id: string, visible: boolean): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const { data, error } = await supabase.from('products').update({ visible }).eq('id', id).select('name');
    if (error) throw error;
    await log(supabase, user.id, `${data?.[0]?.name} ${visible ? 'visible in shop' : 'hidden from shop'}`);
    return { ok: true };
  });
}

export async function addStock(variantId: string, delta: number): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const { data, error } = await supabase.rpc('adjust_stock', { p_variant_id: variantId, p_delta: Math.trunc(delta) });
    if (error) throw error;
    const { data: v } = await supabase.from('product_variants').select('size, products(name)').eq('id', variantId).maybeSingle();
    const pname = (v?.products as unknown as { name: string } | null)?.name ?? '';
    await log(supabase, user.id, `Stock ${pname} · ${v?.size}: +${delta} (now ${data})`);
    return { ok: true };
  });
}

// --- Discount codes & bundles ----------------------------------------------------

export interface CodeDraft {
  code: string;
  pct: boolean;
  value: string;
  min: string;
  until: string;
  limit: string;
  first: boolean;
}

export async function createCode(d: CodeDraft): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const code = d.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) return { ok: false, error: 'code' };
    const value = Number(String(d.value).replace(',', '.'));
    if (!value || value <= 0 || (d.pct && value > 100)) return { ok: false, error: d.pct ? 'pct' : 'value' };
    if (d.until && !/^\d{4}-\d{2}-\d{2}$/.test(d.until)) return { ok: false, error: 'until' };
    const { error } = await supabase.from('discount_codes').insert({
      code,
      is_percent: d.pct,
      value,
      min_order_cents: d.min ? euroToCents(d.min) || 0 : 0,
      valid_until: d.until || null,
      usage_limit: d.limit ? Math.max(1, Math.floor(Number(d.limit))) || null : null,
      first_order_only: d.first,
      active: true,
    });
    if (error) return { ok: false, error: error.code === '23505' ? 'exists' : error.message };
    await log(supabase, user.id, `Code ${code} created`);
    return { ok: true };
  });
}

export async function setCodeActive(code: string, active: boolean): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await owner();
    const { error } = await supabase.from('discount_codes').update({ active }).eq('code', code);
    if (error) throw error;
    return { ok: true };
  });
}

export async function deleteCode(code: string): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const { error } = await supabase.from('discount_codes').delete().eq('code', code);
    if (error) throw error;
    await log(supabase, user.id, `Code ${code} deleted`);
    return { ok: true };
  });
}

export async function createBundle(d: { name: string; summary: string; normal: string; price: string }): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const normal = euroToCents(d.normal);
    const price = euroToCents(d.price);
    if (!d.name.trim() || !(normal > 0) || !(price > 0)) return { ok: false, error: 'bundle' };
    const { error } = await supabase.from('bundles').insert({ name: d.name.trim(), summary: d.summary.trim(), normal_cents: normal, price_cents: price });
    if (error) throw error;
    await log(supabase, user.id, `Bundle ${d.name.trim()} created`);
    return { ok: true };
  });
}

export async function setBundleActive(id: string, active: boolean): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await owner();
    const { error } = await supabase.from('bundles').update({ active }).eq('id', id);
    if (error) throw error;
    return { ok: true };
  });
}

// --- Drop -----------------------------------------------------------------------

/** Saves the drop schedule. Renaming a drop that is already live starts a new drop. */
export async function saveDrop(d: { id?: string; name: string; date: string; time: string; lock: boolean }): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !/^\d{2}:\d{2}$/.test(d.time) || !d.name.trim()) return { ok: false, error: 'invalid' };
    const { data: liveAt, error: tzErr } = await supabase.rpc('berlin_timestamp', { p_date: d.date, p_time: d.time });
    if (tzErr) throw tzErr;
    const row = { name: d.name.trim(), live_at: liveAt, lock_shop: d.lock };
    const { data: cur } = d.id ? await supabase.from('drops').select('*').eq('id', d.id).maybeSingle() : { data: null };
    const curLive = cur && new Date(cur.live_at as string) <= new Date();
    if (cur && !(curLive && cur.name !== row.name)) {
      const changedTime = new Date(cur.live_at as string).getTime() !== new Date(liveAt as string).getTime();
      const { error } = await supabase
        .from('drops')
        .update({ ...row, ...(changedTime ? { stock_snapshot: null, snapshot_at: null, live_notified_at: null } : {}) })
        .eq('id', cur.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('drops').insert(row);
      if (error) throw error;
    }
    await log(supabase, user.id, `Drop ${row.name} scheduled for ${d.date} ${d.time}${d.lock ? ' · shop locked' : ''}`);
    return { ok: true };
  });
}

// --- Settings ---------------------------------------------------------------------

export interface SettingsDraft {
  freeShip: string;
  shipDe: string;
  shipIntl: string;
  usdRate: string;
  popup: boolean;
  popupCode: string;
  popupPct: string;
  popupUntil: string;
  annL: string[];
  annR: string[];
}

export async function saveSettings(s: SettingsDraft): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await owner();
    const cents = (v: string) => euroToCents(v);
    const row = {
      free_ship_cents: cents(s.freeShip),
      ship_de_cents: cents(s.shipDe),
      ship_intl_cents: cents(s.shipIntl),
      usd_rate: Number(String(s.usdRate).replace(',', '.')),
      popup_enabled: s.popup,
      popup_code: s.popupCode.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      popup_pct: Math.round(Number(s.popupPct)),
      popup_until: s.popupUntil.trim(),
      ann_left: s.annL.map((x) => x.trim()).slice(0, 3),
      ann_right: s.annR.map((x) => x.trim()).slice(0, 3),
    };
    const bad = [row.free_ship_cents, row.ship_de_cents, row.ship_intl_cents].some((x) => !Number.isFinite(x) || x < 0) || !(row.usd_rate > 0) || !(row.popup_pct >= 0 && row.popup_pct <= 100);
    if (bad) return { ok: false, error: 'invalid' };
    const { error } = await supabase.from('site_settings').update(row).eq('id', 1);
    if (error) throw error;
    await log(supabase, user.id, 'Settings saved');
    return { ok: true };
  });
}

export async function saveNotif(n: { tg: boolean; tgId: string; wa: boolean; waNo: string; events: string[] }): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await owner();
    const events = n.events.filter((e) => ['order', 'stock', 'refund', 'drop'].includes(e));
    const { error } = await supabase
      .from('owner_settings')
      .update({ notify_telegram: n.tg, telegram_chat: n.tgId.trim().slice(0, 100), notify_whatsapp: n.wa, whatsapp_no: n.waNo.trim().slice(0, 40), notify_events: events })
      .eq('id', 1);
    if (error) throw error;
    return { ok: true };
  });
}

export async function testNotification(): Promise<{ ok: boolean; result?: NotifyResult }> {
  try {
    await owner();
    return { ok: true, result: await notifyOwner('test', '✅ TIC Originals: test notification') };
  } catch (e) {
    console.error(e);
    return { ok: false };
  }
}
