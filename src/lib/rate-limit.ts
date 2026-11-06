import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Counts a request per client in the database (serverless instances share no memory) and says
 * whether it is within the limit. Fails open: a rate-limit outage must not stop the shop.
 */
export async function allowRequest(admin: SupabaseClient, scope: string, headers: Headers, limit: number, windowSeconds: number): Promise<boolean> {
  const ip = headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || 'unknown';
  const key = `${scope}:${createHash('sha256').update(ip).digest('hex')}`;
  const { data, error } = await admin.rpc('hit_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
  if (error) {
    console.error('[rate-limit]', error);
    return true;
  }
  return data === true;
}
