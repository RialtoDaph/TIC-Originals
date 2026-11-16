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
  withdrawalClock,
  parseEuroCents,
  financeSummary,
  financeLedger,
} from '@/lib/owner/derive';
import type { OExpense, OOrder, OProduct } from '@/lib/owner/types';

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
    withdrawnAt: null,
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
    hasLabel: false,
    labelError: '',
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
  model: '',
  preorder: false,
  shipsFrom: null,
  setName: '',
  color: '',
  materialDe: '',
  materialEn: '',
  weightG: null,
  descriptionDe: '',
  descriptionEn: '',
  careDe: '',
  careEn: '',
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

describe('withdrawalClock', () => {
  const day = 864e5;
  const now = new Date('2026-11-16T12:00:00Z').getTime();
  const paid = (withdrawnAt: string | null, payment: 'paid' | 'refunded' = 'paid') => ({ ...order(), payment, withdrawnAt });
  it('counts day 1 on the day the declaration arrives', () => {
    expect(withdrawalClock(paid(new Date(now - 3600e3).toISOString()), now)).toEqual({ day: 1, left: 13, urgent: false });
  });
  it('turns urgent with 3 days or less left and overdue after 14', () => {
    expect(withdrawalClock(paid(new Date(now - 11 * day).toISOString()), now)?.urgent).toBe(true);
    expect(withdrawalClock(paid(new Date(now - 15 * day).toISOString()), now)?.left).toBeLessThan(0);
  });
  it('is null without a withdrawal or once refunded', () => {
    expect(withdrawalClock(paid(null), now)).toBeNull();
    expect(withdrawalClock(paid(new Date(now - day).toISOString(), 'refunded'), now)).toBeNull();
  });
});

describe('parseEuroCents', () => {
  it('reads German and English money input', () => {
    expect(parseEuroCents('1.234,56')).toBe(123456);
    expect(parseEuroCents('1234.56')).toBe(123456);
    expect(parseEuroCents('12,5 €')).toBe(1250);
    expect(parseEuroCents('1.234')).toBe(123400);
    expect(parseEuroCents('7')).toBe(700);
    expect(parseEuroCents('-45,90')).toBe(-4590);
  });
  it('rejects junk, zero and more than two decimals', () => {
    expect(parseEuroCents('')).toBeNull();
    expect(parseEuroCents('abc')).toBeNull();
    expect(parseEuroCents('0')).toBeNull();
    expect(parseEuroCents('1,234,567.891')).toBeNull();
    expect(parseEuroCents('1.23.45')).toBeNull();
    expect(parseEuroCents('1,2,3')).toBeNull();
    expect(parseEuroCents('.5')).toBeNull();
    expect(parseEuroCents('1e3')).toBeNull();
    expect(parseEuroCents('1.234.56')).toBeNull();
    expect(parseEuroCents('1.234.567,89')).toBe(123456789);
    expect(parseEuroCents('1,234.56')).toBe(123456);
    expect(parseEuroCents('12,345')).toBe(1234500);
  });
});

describe('financeSummary', () => {
  const exp = (p: Partial<OExpense> = {}): OExpense => ({ id: 'e' + ++seq, paidOn: '2026-10-05', category: 'production', vendor: 'X', invoiceNo: '', description: '', amountCents: 5000, receipts: [], ...p });
  it('is deeply negative when only money went out', () => {
    const r = financeSummary([], [exp({ amountCents: 300000 })], NOW);
    expect(r.allTime).toEqual({ income: 0, expenses: 300000, result: -300000 });
    expect(r.months.at(-1)?.cumulative).toBe(-300000);
  });
  it('counts income on the paid day and a refund on its own (later) month, shipping once', () => {
    const o = order({ totalCents: 10000, shippingCents: 495, paidAt: '2026-09-28T10:00:00Z', refundedCents: 10000, refundedAt: '2026-10-03T10:00:00Z' });
    const r = financeSummary([o], [], NOW);
    expect(r.months.find((m) => m.month === '2026-09')?.income).toBe(10000);
    expect(r.months.find((m) => m.month === '2026-10')?.income).toBe(-10000);
    expect(r.allTime.income).toBe(0);
  });
  it('subtracts a partial refund without a date in the paid month and reports it', () => {
    const o = order({ totalCents: 10000, paidAt: '2026-09-28T10:00:00Z', refundedCents: 2500, refundedAt: null });
    const r = financeSummary([o], [], NOW);
    expect(r.allTime.income).toBe(7500);
    expect(r.undatedRefunds).toBe(1);
  });
  it('keeps paid orders that were hidden, ignores unpaid ones', () => {
    const r = financeSummary([order({ totalCents: 8000 }), order({ paidAt: null, payment: 'pending', totalCents: 9999 })], [], NOW);
    expect(r.allTime.income).toBe(8000);
  });
  it('buckets by Berlin time at New Year and fills empty months', () => {
    const o = order({ totalCents: 1000, paidAt: '2026-12-31T23:30:00Z' }); // 00:30 on 1 Jan in Berlin
    const r = financeSummary([o], [exp({ paidOn: '2026-08-10', amountCents: 2000 })], new Date('2027-02-10T12:00:00Z'));
    expect(r.months[0].month).toBe('2026-08');
    expect(r.months.find((m) => m.month === '2027-01')?.income).toBe(1000);
    expect(r.months.find((m) => m.month === '2026-12')?.income).toBe(0);
    expect(r.months.at(-1)?.month).toBe('2027-02');
    expect(r.year.income).toBe(1000);
  });
  it('does not count an expense dated in the future yet', () => {
    const r = financeSummary([], [exp({ paidOn: '2026-12-01', amountCents: 9000 }), exp({ paidOn: '2026-10-20', amountCents: 1000 })], NOW);
    expect(r.allTime.expenses).toBe(1000);
  });
  it('treats a credit note as money back, groups by category and counts missing receipts', () => {
    const r = financeSummary([], [exp({ amountCents: 10000, category: 'shipping' }), exp({ amountCents: -2000, category: 'shipping', receipts: [{ id: 'r', name: 'a.pdf', mime: 'application/pdf', sizeBytes: 1, uploadedAt: '' }] })], NOW);
    expect(r.byCategory.shipping).toBe(8000);
    expect(r.withoutReceipt).toBe(1);
  });
});

describe('financeLedger', () => {
  it('lists sales, refunds and expenses by date with money out negative', () => {
    const o = order({ totalCents: 10000, paidAt: '2026-09-28T10:00:00Z', refundedCents: 10000, refundedAt: '2026-10-03T10:00:00Z' });
    const e: OExpense = { id: 'x', paidOn: '2026-09-01', category: 'shipping', vendor: 'DHL', invoiceNo: 'R-1', description: 'Oktober', amountCents: 4000, receipts: [] };
    const l = financeLedger([o, order({ paidAt: null, payment: 'pending' })], [e], () => 'Versand');
    expect(l.map((r) => [r.date, r.kind, r.cents])).toEqual([['2026-09-01', 'Ausgabe', -4000], ['2026-09-28', 'Einnahme', 10000], ['2026-10-03', 'Erstattung', -10000]]);
    expect(l[0].receipt).toBe('nein');
  });
});
