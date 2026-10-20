import { describe, expect, it } from 'vitest';
import {
  accountingMonths,
  berlinDay,
  deDec,
  dropMetrics,
  kleinunternehmer,
  lowStock,
  orderHeat,
  pctDelta,
  periodStats,
  restockSuggestions,
  shortNo,
  statusOf,
  toCsv,
} from '@/lib/owner/derive';
import type { OOrder, OProduct } from '@/lib/owner/types';

const NOW = new Date('2026-10-20T12:00:00Z');
const day = (n: number, h = 10) => new Date(NOW.getTime() - n * 864e5 + (h - 12) * 36e5).toISOString();

let seq = 0;
function order(p: Partial<OOrder> = {}): OOrder {
  seq++;
  return {
    id: 'o' + seq,
    no: 'TIC-2026-AAAA' + String(seq).padStart(2, '0'),
    placedAt: day(1),
    paidAt: day(1),
    shippedAt: null,
    deliveredAt: null,
    returnedAt: null,
    refundedAt: null,
    remindedAt: null,
    firstName: 'A',
    lastName: 'B',
    email: `c${seq}@x.de`,
    street: '',
    extra: '',
    zip: '',
    city: 'Berlin',
    country: 'DE',
    phone: '',
    subtotalCents: 10000,
    discountCode: null,
    discountCents: 0,
    shippingCents: 0,
    totalCents: 10000,
    refundedCents: 0,
    status: 'confirmed',
    payment: 'paid',
    method: 'Card (Stripe)',
    carrier: 'DHL',
    tracking: '',
    note: '',
    flags: [],
    invoiceNo: null,
    items: [{ productId: 'p1', name: 'TIC Heavyweight Hoodie', size: 'M', qty: 1, unitCents: 10000 }],
    ...p,
  };
}

const product = (p: Partial<OProduct> = {}): OProduct => ({
  id: 'p1',
  slug: 'hoodie',
  name: 'TIC Heavyweight Hoodie',
  category: 'hoodies',
  priceCents: 10000,
  images: [],
  visible: true,
  lowStock: 3,
  variants: [
    { id: 'v-s', size: 'S', stock: 10 },
    { id: 'v-m', size: 'M', stock: 4 },
    { id: 'v-l', size: 'L', stock: 0 },
  ],
  waitlist: { L: 5 },
  restockOrdered: false,
  ...p,
});

describe('statusOf', () => {
  it('maps order + payment state to the board columns', () => {
    expect(statusOf(order())[0]).toBe('toShip');
    expect(statusOf(order({ status: 'pending', payment: 'pending' }))[0]).toBe('awaiting');
    expect(statusOf(order({ status: 'shipped' }))[0]).toBe('onTheWay');
    expect(statusOf(order({ status: 'returned' }))[0]).toBe('refundDue');
    expect(statusOf(order({ status: 'returned', payment: 'refunded' }))[0]).toBe('refunded');
    expect(statusOf(order({ status: 'cancelled', payment: 'failed' }))[0]).toBe('cancelled');
  });
});

describe('periodStats', () => {
  it('compares the period with the previous one by payment day', () => {
    const orders = [order({ paidAt: day(1), totalCents: 5000 }), order({ paidAt: day(2), totalCents: 7000 }), order({ paidAt: day(9), totalCents: 6000 }), order({ paidAt: null, payment: 'pending' })];
    const s = periodStats(orders, NOW, 7);
    expect(s.rev).toBe(12000);
    expect(s.n).toBe(2);
    expect(s.prevRev).toBe(6000);
    expect(s.aov).toBe(6000);
    expect(pctDelta(s.rev, s.prevRev)).toEqual({ delta: '+100%', good: true });
  });
  it('counts returning customers', () => {
    const orders = [order({ email: 'x@y.de', placedAt: day(20), paidAt: day(20) }), order({ email: 'x@y.de', placedAt: day(2), paidAt: day(2) }), order({ placedAt: day(1), paidAt: day(1) })];
    expect(Math.round(periodStats(orders, NOW, 7).returning)).toBe(50);
  });
});

describe('restockSuggestions', () => {
  it('flags sold-out sizes as urgent and sizes running out within 14 days', () => {
    const sales = Array.from({ length: 15 }, () => order({ items: [{ productId: 'p1', name: 'H', size: 'M', qty: 1, unitCents: 10000 }] }));
    const [r] = restockSuggestions([product()], sales, NOW);
    expect(r.now).toBe(true);
    const l = r.lines.find((x) => x.size === 'L')!;
    expect(l.qty).toBe(6); // 0 demand + 5 waiting − 0 stock → rounded up to an even 6
    const m = r.lines.find((x) => x.size === 'M')!;
    expect(Math.round(m.days)).toBe(8); // 4 left at 0.5/day
    expect(m.qty).toBe(20); // 0.5 × 45 − 4 = 18.5 → 20
    expect(r.lines.some((x) => x.size === 'S')).toBe(false);
  });
  it('ignores hidden products', () => {
    expect(restockSuggestions([product({ visible: false })], [], NOW)).toEqual([]);
  });
});

describe('lowStock', () => {
  it('lists sizes at or below the alert threshold, emptiest first', () => {
    expect(lowStock([product()]).map((x) => `${x.size}:${x.q}`)).toEqual(['L:0']);
    expect(lowStock([product({ lowStock: 4 })]).map((x) => x.size)).toEqual(['L', 'M']);
  });
});

describe('kleinunternehmer', () => {
  it('nets refunds and projects to year end', () => {
    const orders = [order({ paidAt: '2026-03-01T10:00:00Z', totalCents: 1_000_000 }), order({ paidAt: '2026-09-01T10:00:00Z', totalCents: 1_100_000, refundedAt: '2026-09-10T10:00:00Z', refundedCents: 100_000 }), order({ paidAt: '2025-12-31T10:00:00Z', totalCents: 999_999 })];
    const ku = kleinunternehmer(orders, NOW);
    expect(ku.ytd).toBe(2_000_000);
    expect(ku.proj).toBeGreaterThan(ku.ytd);
    expect(ku.projPct).toBeGreaterThan(0.9);
  });
});

describe('accountingMonths + CSV', () => {
  it('groups revenue by payment month and refunds by refund month (Berlin time)', () => {
    const orders = [
      order({ paidAt: '2026-08-31T22:30:00Z', totalCents: 5000, shippingCents: 519 }), // 1 Sep in Berlin
      order({ paidAt: '2026-09-15T10:00:00Z', totalCents: 7000, refundedAt: '2026-10-02T10:00:00Z', refundedCents: 7000 }),
    ];
    const { year, months } = accountingMonths(orders, NOW);
    expect(year).toBe(2026);
    expect(months).toEqual([
      { month: 8, orders: 2, gross: 12000, refunds: 0, shipping: 519, net: 12000 },
      { month: 9, orders: 0, gross: 0, refunds: 7000, shipping: 0, net: -7000 },
    ]);
    expect(toCsv([['Monat', 'Brutto'], ['September 2026', deDec(12000)]])).toBe('﻿"Monat";"Brutto"\n"September 2026";"120,00"');
  });
});

describe('orderHeat', () => {
  it('buckets orders by Berlin weekday and hour', () => {
    // 2026-10-16 is a Friday; 16:00 UTC = 18:00 Berlin (CEST).
    const { heat, peak } = orderHeat([order({ placedAt: '2026-10-16T16:00:00Z' }), order({ placedAt: '2026-10-16T16:30:00Z' })], NOW);
    expect(heat[4][18]).toBe(2);
    expect(peak).toEqual({ v: 2, day: 4, hour: 18 });
  });
});

describe('dropMetrics', () => {
  it('measures the first 48 hours after release', () => {
    const drop = { id: 'd', name: '001', liveAt: day(10), lockShop: false, snapshot: { 'v-s': 10, 'v-m': 10 }, firstSoldOutAt: new Date(new Date(day(10)).getTime() + 19 * 36e5).toISOString() };
    const orders = [order({ placedAt: day(10, 13), paidAt: day(10, 13) }), order({ placedAt: day(5), paidAt: day(5) })];
    const m = dropMetrics(drop, orders, [product()]);
    expect(m).toMatchObject({ units: 1, revenue: 10000, sell: 5, soldOutH: 19, ret: 0 });
  });
});

describe('helpers', () => {
  it('formats compact order numbers and Berlin days', () => {
    expect(shortNo('TIC-2026-AB12CD')).toBe('TIC-AB12CD');
    expect(berlinDay('2026-10-19T22:30:00Z')).toBe('2026-10-20');
  });
});
