import { describe, expect, it } from 'vitest';
import { orderConfirmation } from '@/i18n/emails';

const order = { order_no: 'TIC-2026-ABC123', first_name: 'Max', last_name: 'M', street: 'Hauptstr. 1', extra: '', zip: '10115', city: 'Berlin', country: 'DE', subtotal_cents: 1489, discount_code: null, discount_cents: 0, shipping_cents: 495, total_cents: 1984 };
const items = [{ product_name: 'Chosen1 Pants — Grau', size: 'M', qty: 1, unit_cents: 1489 }];

describe('order confirmation pre-order note', () => {
  it('states the latest ship date and the tracking email', () => {
    const de = orderConfirmation(order, items, 'de', false, '2026-11-21').text;
    expect(de).toContain('spätestens am 21.11.2026');
    expect(de).toContain('DHL-Sendungsnummer');
    expect(orderConfirmation(order, items, 'en', false, '2026-11-21').text).toContain('by 21 Nov 2026 at the latest');
  });

  it('says the date follows when not set', () => {
    expect(orderConfirmation(order, items, 'de', false, 'tbd').text).toContain('Versandtermin teilen wir dir per E-Mail mit');
  });

  it('has no pre-order note for in-stock orders', () => {
    expect(orderConfirmation(order, items, 'de', false).text).not.toContain('VORBESTELLUNG');
  });
});

describe('Delivery by CEO orders', () => {
  const ceo = { ...order, carrier: 'CEO' };
  it('explains the personal hand-over and promises no DHL tracking, even for pre-orders', () => {
    const de = orderConfirmation(ceo, items, 'de', false, '2026-12-01').text;
    expect(de).toContain('Delivery by CEO');
    expect(de).not.toContain('bekommst du eine E-Mail mit der DHL-Sendungsnummer');
    expect(orderConfirmation(ceo, items, 'en', false, '2026-12-01').text).not.toContain("you'll get an email with the DHL tracking number");
  });
  it('leaves DHL orders unchanged', () => {
    expect(orderConfirmation({ ...order, carrier: 'DHL' }, items, 'de', false).text).not.toContain('Delivery by CEO');
  });
});
