// Checkout pricing rules (shared by the browser for display and the server for the real charge).
import type { DiscountCode, SiteSettings } from './types';

export type CodeProblem = 'unknown' | 'inactive' | 'expired' | 'limit' | 'min' | 'first';

export function toCents(eur: number) {
  return Math.round(eur * 100);
}

/** Discount in cents for a subtotal. Percent codes round to the cent; fixed codes never exceed the subtotal. */
export function discountCents(code: Pick<DiscountCode, 'isPercent' | 'value'>, subtotalCents: number) {
  if (code.isPercent) return Math.round((subtotalCents * code.value) / 100);
  return Math.min(subtotalCents, toCents(code.value));
}

/** Today's date in the shop timezone as YYYY-MM-DD. */
export function berlinDate(now: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);
}

export function checkCode(
  code: DiscountCode | null,
  ctx: { subtotalCents: number; now: Date; isFirstOrder: boolean },
): CodeProblem | null {
  if (!code) return 'unknown';
  if (!code.active) return 'inactive';
  if (code.validUntil && berlinDate(ctx.now) > code.validUntil) return 'expired';
  if (code.usageLimit !== null && code.usedCount >= code.usageLimit) return 'limit';
  if (ctx.subtotalCents < code.minOrderCents) return 'min';
  if (code.firstOrderOnly && !ctx.isFirstOrder) return 'first';
  return null;
}

export interface Totals {
  subtotalCents: number;
  discountCents: number;
  netCents: number;
  shippingCents: number;
  totalCents: number;
  /** Amount still missing for free shipping (0 when reached). */
  freeLeftCents: number;
}

/** Free shipping applies to the order value after discounts. Germany ships domestic, everything else international. */
export function computeTotals(input: {
  subtotalCents: number;
  discountCents: number;
  country: string;
  settings: Pick<SiteSettings, 'freeShipCents' | 'shipDeCents' | 'shipIntlCents'>;
}): Totals {
  const { subtotalCents, settings } = input;
  const discount = Math.min(input.discountCents, subtotalCents);
  const net = subtotalCents - discount;
  const free = net >= settings.freeShipCents;
  const shipping = subtotalCents === 0 || free ? 0 : input.country === 'DE' ? settings.shipDeCents : settings.shipIntlCents;
  return {
    subtotalCents,
    discountCents: discount,
    netCents: net,
    shippingCents: shipping,
    totalCents: net + shipping,
    freeLeftCents: Math.max(0, settings.freeShipCents - net),
  };
}

/** USD display price as in the design: rounded up to the next 5 and minus 1 (e.g. 69.89 € → 79 $). */
export function usdPrice(eur: number, rate: number) {
  return Math.ceil((eur * rate) / 5) * 5 - 1;
}
