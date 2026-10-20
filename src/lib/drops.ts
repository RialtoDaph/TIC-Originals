import 'server-only';
import type { Drop } from './types';
import { createAdminClient } from './supabase/admin';
import { notifyOwner } from './notify';

export function isShopLocked(drop: Drop | null, now = new Date()) {
  return !!drop && drop.lockShop && new Date(drop.liveAt).getTime() > now.getTime();
}

/**
 * When a drop's release time has passed, capture the stock at that moment (used by the
 * "Drop vs Drop" comparison in Insights) and send the "Drop goes live" notification — once.
 * Runs lazily on storefront requests, so no cron job is needed.
 */
export async function maybeMarkDropLive(drop: Drop) {
  if (new Date(drop.liveAt).getTime() > Date.now()) return;
  try {
    const supabase = createAdminClient();
    const { data: variants } = await supabase.from('product_variants').select('id, product_id, size, stock');
    const snapshot = Object.fromEntries((variants ?? []).map((v) => [v.id, v.stock]));
    const { data: updated } = await supabase
      .from('drops')
      .update({ stock_snapshot: snapshot, snapshot_at: new Date().toISOString(), live_notified_at: new Date().toISOString() })
      .eq('id', drop.id)
      .is('snapshot_at', null)
      .select('id');
    if (updated?.length) await notifyOwner('drop', `🚀 Drop ${drop.name} ist live.`);
  } catch (e) {
    console.error('[drops] mark live failed', e);
  }
}
