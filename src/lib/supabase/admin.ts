import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv, serverEnv } from '@/lib/env';

// Service-role client: bypasses RLS. Only for trusted server code (checkout, webhook, tracking).
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl(), serverEnv.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
