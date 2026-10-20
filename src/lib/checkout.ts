import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkCode, computeTotals, discountCents, type CodeProblem, type Totals } from './pricing';
import { loadSettings, mapProduct, PRODUCT_SELECT } from './catalog';
import type { DiscountCode } from './types';
import type { CartItemInput } from './checkout-items';

export { sanitizeItems, type CartItemInput } from './checkout-items';

export interface PricedLine {
  product_id: string;
  name: string;
  size: string;
  qty: number;
  unit_cents: number;
}

export type PriceResult =
  | {
      ok: true;
      lines: PricedLine[];
      totals: Totals;
      code: DiscountCode | null;
      codeProblem: CodeProblem | null;
      /** Minimum order value of the entered code (for the "min" message). */
      codeMinCents: number;
    }
  | { ok: false; error: 'empty' | 'stock'; name?: string; size?: string };

export function mapCode(r: Record<string, unknown>): DiscountCode {
  return {
    code: r.code as string,
    isPercent: r.is_percent as boolean,
    value: Number(r.value),
    minOrderCents: r.min_order_cents as number,
    validUntil: (r.valid_until as string | null) ?? null,
    usageLimit: (r.usage_limit as number | null) ?? null,
    usedCount: r.used_count as number,
    firstOrderOnly: r.first_order_only as boolean,
    active: r.active as boolean,
  };
}

/**
 * Prices a cart from the database (never from client-sent prices), checks stock and the
 * discount code. Uses the service-role client because codes and order history are private.
 */
export async function priceCart(
  admin: SupabaseClient,
  input: { items: CartItemInput[]; code?: string | null; email?: string | null; country: string },
): Promise<PriceResult> {
  if (!input.items.length) return { ok: false, error: 'empty' };
  const ids = [...new Set(input.items.map((i) => i.id))];
  const { data, error } = await admin.from('products').select(PRODUCT_SELECT).in('id', ids).eq('visible', true);
  if (error) throw error;
  const products = new Map((data ?? []).map((r) => [r.id as string, mapProduct(r)]));

  const lines: PricedLine[] = [];
  for (const it of input.items) {
    const p = products.get(it.id);
    const v = p?.variants.find((x) => x.size === it.size);
    if (!p || !v || v.stock < it.qty) return { ok: false, error: 'stock', name: p?.name, size: it.size };
    lines.push({ product_id: p.id, name: p.name, size: it.size, qty: it.qty, unit_cents: p.priceCents });
  }
  const subtotal = lines.reduce((a, l) => a + l.unit_cents * l.qty, 0);
  const settings = await loadSettings(admin);

  let code: DiscountCode | null = null;
  let codeProblem: CodeProblem | null = null;
  const codeStr = input.code?.trim().toUpperCase();
  if (codeStr) {
    const { data: row } = await admin.from('discount_codes').select('*').eq('code', codeStr).maybeSingle();
    code = row ? mapCode(row) : null;
    let isFirstOrder = true;
    if (code?.firstOrderOnly && input.email) {
      const { count } = await admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .ilike('email', input.email.trim())
        .in('payment_status', ['paid', 'pending']);
      isFirstOrder = (count ?? 0) === 0;
    }
    codeProblem = checkCode(code, { subtotalCents: subtotal, now: new Date(), isFirstOrder });
  }
  const totals = computeTotals({
    subtotalCents: subtotal,
    discountCents: code && !codeProblem ? discountCents(code, subtotal) : 0,
    country: input.country,
    settings,
  });
  return { ok: true, lines, totals, code: codeProblem ? null : code, codeProblem, codeMinCents: code?.minOrderCents ?? 0 };
}
