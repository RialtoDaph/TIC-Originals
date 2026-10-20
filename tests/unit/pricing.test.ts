import { describe, expect, it } from 'vitest';
import { checkCode, computeTotals, discountCents, usdPrice } from '@/lib/pricing';
import type { DiscountCode } from '@/lib/types';

const settings = { freeShipCents: 8000, shipDeCents: 519, shipIntlCents: 1419 };
const code = (p: Partial<DiscountCode> = {}): DiscountCode => ({
  code: 'TIC15', isPercent: true, value: 15, minOrderCents: 0, validUntil: null, usageLimit: null, usedCount: 0, firstOrderOnly: false, active: true, ...p,
});

describe('computeTotals (checkout reference rules)', () => {
  it('charges German shipping below the threshold', () => {
    const t = computeTotals({ subtotalCents: 6989, discountCents: 0, country: 'DE', settings });
    expect(t).toMatchObject({ shippingCents: 519, totalCents: 7508, freeLeftCents: 1011 });
  });
  it('charges international shipping outside Germany', () => {
    expect(computeTotals({ subtotalCents: 6989, discountCents: 0, country: 'AT', settings }).shippingCents).toBe(1419);
  });
  it('applies the free-shipping threshold after the discount', () => {
    // 89,78 € − 15 % = 76,31 € → below 80 € → shipping is charged.
    const sub = 8978;
    const t = computeTotals({ subtotalCents: sub, discountCents: discountCents(code(), sub), country: 'DE', settings });
    expect(t.discountCents).toBe(1347);
    expect(t.shippingCents).toBe(519);
    expect(t.totalCents).toBe(8978 - 1347 + 519);
  });
  it('ships free at exactly the threshold', () => {
    expect(computeTotals({ subtotalCents: 8000, discountCents: 0, country: 'FR', settings }).shippingCents).toBe(0);
  });
  it('never discounts below zero', () => {
    const t = computeTotals({ subtotalCents: 500, discountCents: discountCents(code({ isPercent: false, value: 10 }), 500), country: 'DE', settings });
    expect(t.netCents).toBe(0);
  });
});

describe('checkCode', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  it('accepts a valid code', () => expect(checkCode(code(), { subtotalCents: 1000, now, isFirstOrder: true })).toBeNull());
  it('rejects unknown, inactive, expired, used-up, below-minimum and repeat-customer cases', () => {
    expect(checkCode(null, { subtotalCents: 1, now, isFirstOrder: true })).toBe('unknown');
    expect(checkCode(code({ active: false }), { subtotalCents: 1, now, isFirstOrder: true })).toBe('inactive');
    expect(checkCode(code({ validUntil: '2026-10-19' }), { subtotalCents: 1, now, isFirstOrder: true })).toBe('expired');
    expect(checkCode(code({ usageLimit: 5, usedCount: 5 }), { subtotalCents: 1, now, isFirstOrder: true })).toBe('limit');
    expect(checkCode(code({ minOrderCents: 10000 }), { subtotalCents: 9999, now, isFirstOrder: true })).toBe('min');
    expect(checkCode(code({ firstOrderOnly: true }), { subtotalCents: 1, now, isFirstOrder: false })).toBe('first');
  });
  it('treats valid_until as inclusive in Berlin time', () => {
    // 23:30 UTC on the 20th is already the 21st in Berlin.
    expect(checkCode(code({ validUntil: '2026-10-20' }), { subtotalCents: 1, now: new Date('2026-10-20T21:30:00Z'), isFirstOrder: true })).toBeNull();
    expect(checkCode(code({ validUntil: '2026-10-20' }), { subtotalCents: 1, now: new Date('2026-10-20T22:30:00Z'), isFirstOrder: true })).toBe('expired');
  });
});

describe('usdPrice', () => {
  it('rounds up to the next 5 minus 1, as in the design', () => {
    expect(usdPrice(69.89, 1.1)).toBe(79);
    expect(usdPrice(119.89, 1.1)).toBe(134);
  });
});
