// Pure dashboard calculations (no I/O) — unit tested in tests/unit/owner-derive.test.ts.
import type { Tone } from '@/lib/tokens';
import type { OOrder, OProduct, ODrop } from './types';

export const SIZES = ['S', 'M', 'L', 'XL'];
export const DAY = 864e5;
export const KU_LIMIT_CENTS = 25000_00; // § 19 UStG: prior-year turnover limit
export const LEAD_DAYS = 7;
export const COVER_DAYS = 45;

const TZ = 'Europe/Berlin';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

/** YYYY-MM-DD in the shop timezone. */
export const berlinDay = (d: Date | string) => dayFmt.format(new Date(d));
/** dd.mm */
export const dm = (d: Date | string) => new Date(d).toLocaleDateString('de-DE', { timeZone: TZ, day: '2-digit', month: '2-digit' });

export function berlinParts(d: Date | string) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: '2-digit', hourCycle: 'h23', month: 'numeric', year: 'numeric' }).formatToParts(new Date(d));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
  return { weekday: wd, hour: Number(get('hour')), month: Number(get('month')) - 1, year: Number(get('year')) };
}

/** The last `n` days (oldest first) as YYYY-MM-DD, ending today. */
export function lastDays(now: Date, n: number, offset = 0) {
  return Array.from({ length: n }, (_, i) => berlinDay(new Date(now.getTime() - (n - 1 - i + offset) * DAY)));
}

// --- Order states (as in the prototype) ------------------------------------
export const isPaid = (o: OOrder) => o.payment === 'paid';
export const toShip = (o: OOrder) => o.payment === 'paid' && (o.status === 'confirmed' || o.status === 'processing');
export const needsAtt = (o: OOrder) => o.status === 'returned' && o.payment === 'paid';
export const awaiting = (o: OOrder) => o.payment === 'pending' && o.status === 'pending';
export const onTheWay = (o: OOrder) => o.status === 'shipped';

export type StatusKey = 'refundDue' | 'awaiting' | 'toShip' | 'onTheWay' | 'delivered' | 'refunded' | 'cancelled' | 'returned';
export function statusOf(o: OOrder): [StatusKey, Tone] {
  if (needsAtt(o)) return ['refundDue', 'red'];
  if (awaiting(o)) return ['awaiting', 'amber'];
  if (toShip(o)) return ['toShip', 'blue'];
  if (o.status === 'shipped') return ['onTheWay', 'grey'];
  if (o.status === 'delivered') return o.payment === 'refunded' ? ['refunded', 'grey'] : ['delivered', 'green'];
  if (o.status === 'returned') return ['refunded', 'grey'];
  return ['cancelled', 'grey'];
}

export const shortName = (n: string) => n.replace('TIC ', '').replace('Till I Collapse ', '');
export const itemsText = (o: OOrder) => o.items.map((i) => shortName(i.name) + ' ' + i.size + (i.qty > 1 ? ' ×' + i.qty : '')).join(' · ');
export const customerName = (o: OOrder) => `${o.firstName} ${o.lastName}`.trim();

// --- Revenue series ---------------------------------------------------------
/** Paid revenue (cents) per Berlin day for the given days. */
export function revenueByDay(orders: OOrder[], days: string[]) {
  const idx = new Map(days.map((d, i) => [d, i]));
  const rev = days.map(() => 0);
  const cnt = days.map(() => 0);
  for (const o of orders) {
    if (!o.paidAt) continue;
    const i = idx.get(berlinDay(o.paidAt));
    if (i === undefined) continue;
    rev[i] += o.totalCents;
    cnt[i] += 1;
  }
  return { rev, cnt };
}

export function pctDelta(cur: number, prev: number, inverse = false) {
  if (!prev) return { delta: cur ? '+100%' : '±0%', good: inverse ? !cur : true };
  const v = ((cur - prev) / prev) * 100;
  return { delta: (v >= 0 ? '+' : '') + v.toFixed(0) + '%', good: inverse ? v <= 0 : v >= 0 };
}

/** Share of orders in a window (by placed date) that were returned. */
export function returnRate(orders: OOrder[], from: number, to: number) {
  const inWin = orders.filter((o) => o.paidAt && new Date(o.placedAt).getTime() >= from && new Date(o.placedAt).getTime() < to);
  if (!inWin.length) return 0;
  return (inWin.filter((o) => o.status === 'returned' || o.returnedAt).length / inWin.length) * 100;
}

export function periodStats(orders: OOrder[], now: Date, days: number) {
  const cur = revenueByDay(orders, lastDays(now, days));
  const prev = revenueByDay(orders, lastDays(now, days, days));
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const rev = sum(cur.rev), prevRev = sum(prev.rev), n = sum(cur.cnt), prevN = sum(prev.cnt);
  const end = now.getTime();
  const start = end - days * DAY;
  // Returning customers: orders in the period whose email ordered before.
  const firstOrder = new Map<string, number>();
  for (const o of orders) {
    if (!o.paidAt) continue;
    const k = o.email.toLowerCase();
    const t = new Date(o.placedAt).getTime();
    firstOrder.set(k, Math.min(firstOrder.get(k) ?? Infinity, t));
  }
  const returningShare = (from: number, to: number) => {
    const win = orders.filter((o) => o.paidAt && new Date(o.placedAt).getTime() >= from && new Date(o.placedAt).getTime() < to);
    if (!win.length) return 0;
    return (win.filter((o) => (firstOrder.get(o.email.toLowerCase()) ?? 0) < new Date(o.placedAt).getTime()).length / win.length) * 100;
  };
  return {
    cur,
    prev,
    rev,
    prevRev,
    n,
    prevN,
    aov: n ? rev / n : 0,
    prevAov: prevN ? prevRev / prevN : 0,
    returning: returningShare(start, end),
    prevReturning: returningShare(start - days * DAY, start),
    returnRate: returnRate(orders, start, end),
    prevReturnRate: returnRate(orders, start - days * DAY, start),
  };
}

// --- Products ---------------------------------------------------------------
/** Units sold per product id / per "productId|size" over the last `days` days (paid orders). */
export function unitsSold(orders: OOrder[], now: Date, days: number) {
  const from = now.getTime() - days * DAY;
  const byProduct = new Map<string, { units: number; revenue: number; returned: number }>();
  const byVariant = new Map<string, number>();
  const bySize = new Map<string, number>();
  for (const o of orders) {
    if (!o.paidAt || new Date(o.paidAt).getTime() < from) continue;
    const returned = o.status === 'returned' || !!o.returnedAt;
    for (const i of o.items) {
      if (!i.productId) continue;
      const p = byProduct.get(i.productId) ?? { units: 0, revenue: 0, returned: 0 };
      p.units += i.qty;
      p.revenue += i.qty * i.unitCents;
      if (returned) p.returned += i.qty;
      byProduct.set(i.productId, p);
      const vk = i.productId + '|' + i.size;
      byVariant.set(vk, (byVariant.get(vk) ?? 0) + i.qty);
      bySize.set(i.size, (bySize.get(i.size) ?? 0) + i.qty);
    }
  }
  return { byProduct, byVariant, bySize };
}

export interface RestockLine {
  size: string;
  stock: number;
  waiting: number;
  days: number;
  qty: number;
}
export interface RestockSuggestion {
  product: OProduct;
  lines: RestockLine[];
  minDays: number;
  now: boolean;
  orderBy: Date;
}

/**
 * Restock suggestions: a size needs restocking when it is sold out or runs out within 14 days at the
 * last-30-day sales rate. Suggested quantity covers 45 days of demand plus the waitlist (rounded to 2).
 */
export function restockSuggestions(products: OProduct[], orders: OOrder[], now: Date): RestockSuggestion[] {
  const { byVariant } = unitsSold(orders, now, 30);
  const out: RestockSuggestion[] = [];
  for (const p of products) {
    if (!p.visible) continue;
    const lines: RestockLine[] = [];
    for (const v of p.variants) {
      const rate = (byVariant.get(p.id + '|' + v.size) ?? 0) / 30;
      const waiting = p.waitlist[v.size] ?? 0;
      const days = v.stock === 0 ? 0 : rate ? v.stock / rate : 99;
      if (v.stock === 0 || days < 14) {
        lines.push({ size: v.size, stock: v.stock, waiting, days, qty: Math.max(2, Math.ceil((rate * COVER_DAYS + waiting - v.stock) / 2) * 2) });
      }
    }
    if (lines.length) {
      const minDays = Math.min(...lines.map((l) => l.days));
      out.push({ product: p, lines, minDays, now: minDays <= LEAD_DAYS, orderBy: new Date(now.getTime() + (Math.floor(minDays) - LEAD_DAYS) * DAY) });
    }
  }
  return out.sort((a, b) => a.minDays - b.minDays);
}

export function lowStock(products: OProduct[], limit = 5) {
  return products
    .flatMap((p) => p.variants.map((v) => ({ p, size: v.size, q: v.stock })))
    .filter((x) => x.q <= x.p.lowStock)
    .sort((a, b) => a.q - b.q)
    .slice(0, limit);
}

// --- Kleinunternehmer -----------------------------------------------------
/** Net revenue (paid minus refunds) this calendar year and the straight-line projection to 31.12. */
export function kleinunternehmer(orders: OOrder[], now: Date) {
  const year = berlinParts(now).year;
  let ytd = 0;
  for (const o of orders) {
    if (o.paidAt && berlinParts(o.paidAt).year === year) ytd += o.totalCents;
    if (o.refundedAt && berlinParts(o.refundedAt).year === year) ytd -= o.refundedCents;
  }
  const start = new Date(Date.UTC(year, 0, 1)).getTime();
  const daysIn = (Date.UTC(year + 1, 0, 1) - start) / DAY;
  const elapsed = Math.max(1, (now.getTime() - start) / DAY);
  const proj = (ytd / elapsed) * daysIn;
  return { ytd, proj, pct: ytd / KU_LIMIT_CENTS, projPct: proj / KU_LIMIT_CENTS, limit: KU_LIMIT_CENTS };
}

// --- Bookkeeping ------------------------------------------------------------
export interface MonthRow {
  month: number;
  orders: number;
  gross: number;
  refunds: number;
  shipping: number;
  net: number;
}

/** Monthly figures for the current year: revenue by payment date, refunds by refund date. */
export function accountingMonths(orders: OOrder[], now: Date): { year: number; months: MonthRow[] } {
  const year = berlinParts(now).year;
  const rows = new Map<number, MonthRow>();
  const row = (m: number) => rows.get(m) ?? rows.set(m, { month: m, orders: 0, gross: 0, refunds: 0, shipping: 0, net: 0 }).get(m)!;
  for (const o of orders) {
    if (o.paidAt) {
      const p = berlinParts(o.paidAt);
      if (p.year === year) {
        const r = row(p.month);
        r.orders += 1;
        r.gross += o.totalCents;
        r.shipping += o.shippingCents;
      }
    }
    if (o.refundedAt && o.refundedCents) {
      const p = berlinParts(o.refundedAt);
      if (p.year === year) row(p.month).refunds += o.refundedCents;
    }
  }
  const months = [...rows.values()].sort((a, b) => a.month - b.month).map((r) => ({ ...r, net: r.gross - r.refunds }));
  return { year, months };
}

/** CSV for the Steuerberater: semicolon separated, German decimal commas, UTF-8 BOM. */
export function toCsv(rows: (string | number)[][]) {
  return '﻿' + rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n');
}
export const deDec = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

// --- Order timing -----------------------------------------------------------
/** Orders per weekday (Mon=0) × hour over the last 90 days, plus the peak cell. */
export function orderHeat(orders: OOrder[], now: Date) {
  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const from = now.getTime() - 90 * DAY;
  for (const o of orders) {
    if (!o.paidAt || new Date(o.placedAt).getTime() < from) continue;
    const p = berlinParts(o.placedAt);
    heat[p.weekday][p.hour] += 1;
  }
  let peak = { v: 0, day: 4, hour: 18 }; // Default: Friday 18:00 until there is data.
  heat.forEach((r, d) => r.forEach((v, h) => v > peak.v && (peak = { v, day: d, hour: h })));
  return { heat, peak };
}

// --- Drops -------------------------------------------------------------------
export function dropMetrics(drop: ODrop, orders: OOrder[], products: OProduct[]) {
  const from = new Date(drop.liveAt).getTime();
  const to = from + 48 * 3600e3;
  const win = orders.filter((o) => o.paidAt && new Date(o.placedAt).getTime() >= from && new Date(o.placedAt).getTime() < to);
  const units = win.reduce((a, o) => a + o.items.reduce((x, i) => x + i.qty, 0), 0);
  const revenue = win.reduce((a, o) => a + o.totalCents, 0);
  const variantIds = new Set(products.flatMap((p) => p.variants.map((v) => v.id)));
  const startStock = drop.snapshot ? Object.entries(drop.snapshot).filter(([id]) => variantIds.has(id)).reduce((a, [, n]) => a + n, 0) : 0;
  const sell = startStock ? (units / startStock) * 100 : 0;
  const soldOutH = drop.firstSoldOutAt ? (new Date(drop.firstSoldOutAt).getTime() - from) / 3600e3 : null;
  const ret = win.length ? (win.filter((o) => o.status === 'returned' || o.returnedAt).length / win.length) * 100 : 0;
  return { units, revenue, sell, soldOutH, ret };
}

// --- Customers -------------------------------------------------------------
export function customerStats(orders: OOrder[], email: string) {
  const os = orders.filter((o) => o.email.toLowerCase() === email.toLowerCase());
  const sizes = new Map<string, number>();
  os.forEach((o) => o.items.forEach((i) => sizes.set(i.size, (sizes.get(i.size) ?? 0) + i.qty)));
  return {
    n: os.length,
    spent: os.filter((o) => o.payment === 'paid').reduce((a, o) => a + o.totalCents, 0),
    size: [...sizes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '–',
    name: os[0] ? customerName(os[0]) : '',
  };
}

/** Compact order number for cards and task rows: TIC-2026-ABC123 → TIC-ABC123 (as in the design). */
export const shortNo = (no: string) => no.replace(/^TIC-\d{4}-/, 'TIC-');
