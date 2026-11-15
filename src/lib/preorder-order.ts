import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shipping date of an order with pre-order items: the latest `ships_from` among them (the whole
 * order ships together). 'tbd' when a pre-order item has no date yet, null when nothing is pre-order.
 */
export async function orderShipDate(admin: SupabaseClient, productIds: string[]): Promise<string | 'tbd' | null> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) return null;
  const { data } = await admin.from('products').select('preorder, ships_from').in('id', ids).eq('preorder', true);
  const pre = data ?? [];
  if (!pre.length) return null;
  const dates = pre.map((p) => p.ships_from as string | null);
  if (dates.some((d) => !d)) return 'tbd';
  return (dates as string[]).sort().at(-1)!;
}
