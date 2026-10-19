import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkCode, computeTotals, discountCents, type CodeProblem, type Totals } from './pricing';
import { loadSettings, mapProduct, PRODUCT_SELECT } from './catalog';
import type { DiscountCode } from './types';

export interface CartItemInput {
  id: string;
  size: string;
  qty: number;
}

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalise untrusted cart input: valid ids, merged duplicates, sane quantities. */
export function sanitizeItems(raw: unknown): CartItemInput[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, CartItemInput>();
  for (const r of raw.slice(0, 50)) {
    if (!r || typeof r !== 'object') continue;
    const { id, size, qty } = r as Record<string, unknown>;
    if (typeof id !== 'string' || !UUID_RE.test(id) || typeof size !== 'string' || size.length > 10) continue;
    const q = Math.floor(Number(qty));
    if (!Number.isFinite(q) || q < 1) continue;
    const key = id + '|' + size;
    const prev = merged.get(key);
    merged.set(key, { id, size, qty: Math.min(99, (prev?.qty ?? 0) + q) });
  }
  return [...merged.values()];
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
