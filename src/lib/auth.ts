import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export class ForbiddenError extends Error {
  constructor() {
    super('forbidden');
  }
}

/**
 * Server-side owner check. Pages call it with `onFail: 'redirect'` (non-owners go to /),
 * server actions and route handlers with the default `'throw'`.
 */
export async function requireOwner(opts: { onFail?: 'redirect' | 'throw' } = {}) {
  const { supabase, user } = await getSessionUser();
  let isOwner = false;
  if (user) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    isOwner = data?.role === 'owner';
  }
  if (!user || !isOwner) {
    if (opts.onFail === 'redirect') redirect('/');
    throw new ForbiddenError();
  }
  return { supabase, user };
}
