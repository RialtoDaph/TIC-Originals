import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';

// Anonymous client without the visitor's session: what any shopper may see (RLS as `anon`).
// Used for the storefront catalogue so an owner browsing the shop doesn't see hidden products.
export function createPublicClient() {
  return createClient(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
