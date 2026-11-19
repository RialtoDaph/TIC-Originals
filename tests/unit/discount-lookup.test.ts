import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/catalog', () => ({
  PRODUCT_SELECT: '*',
  loadSettings: async () => ({ freeShipCents: 8000, shipDeCents: 495, shipIntlCents: 1495 }),
  mapProduct: (r: { id: string }) => ({ id: r.id, name: 'Tee', priceCents: 5000, variants: [{ size: 'M', stock: 5 }] }),
}));
vi.mock('@/lib/preorder', () => ({ isTbd: () => false, preorderDate: () => null }));

import { priceCart } from '@/lib/checkout';

const ID = '11111111-1111-4111-8111-111111111111';
const items = [{ id: ID, size: 'M', qty: 1 }];

// Minimal stand-in for the Supabase query builder: every chain ends in a thenable/maybeSingle result.
function fakeAdmin(codeResult: { data: unknown; error: unknown }) {
  const chain = (result: unknown): unknown =>
    new Proxy(() => {}, {
      get: (_t, prop) => (prop === 'then' ? (res: (v: unknown) => void) => res(result) : prop === 'maybeSingle' ? () => Promise.resolve(result) : () => chain(result)),
    });
  return {
    from: (table: string) => (table === 'discount_codes' ? chain(codeResult) : chain({ data: [{ id: ID }], error: null })),
  } as never;
}

describe('priceCart discount lookup', () => {
  it('reports a genuinely unknown code as "unknown"', async () => {
    const r = await priceCart(fakeAdmin({ data: null, error: null }), { items, code: 'NOPE', country: 'DE' });
    expect(r).toMatchObject({ ok: true, codeProblem: 'unknown' });
  });

  it('throws on a database error instead of calling a valid code "unknown"', async () => {
    await expect(priceCart(fakeAdmin({ data: null, error: new Error('db down') }), { items, code: 'WELCOME10', country: 'DE' })).rejects.toThrow('db down');
  });

  it('applies a valid code', async () => {
    const row = { code: 'WELCOME10', is_percent: true, value: 10, min_order_cents: 0, valid_until: null, usage_limit: null, used_count: 0, first_order_only: false, active: true };
    const r = await priceCart(fakeAdmin({ data: row, error: null }), { items, code: 'welcome10', country: 'DE' });
    expect(r).toMatchObject({ ok: true, codeProblem: null });
    if (r.ok) expect(r.totals.discountCents).toBe(500);
  });
});
