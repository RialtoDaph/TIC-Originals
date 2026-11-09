import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { allowRequest } from '@/lib/rate-limit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Link target of the double opt-in and unsubscribe emails. The unguessable token is the credential.
export async function GET(req: NextRequest) {
  const a = req.nextUrl.searchParams.get('a');
  const t = req.nextUrl.searchParams.get('t') ?? '';
  const done = (status: string) => NextResponse.redirect(new URL(`/newsletter/${status}`, req.url));
  if ((a !== 'confirm' && a !== 'unsubscribe') || !UUID_RE.test(t)) return done('invalid');

  const admin = createAdminClient();
  if (!(await allowRequest(admin, 'newsletter-link', req.headers, 30, 600))) return done('invalid');

  if (a === 'confirm') {
    const { data, error } = await admin
      .from('newsletter_subscribers')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('token', t)
      .is('confirmed_at', null)
      .select('email');
    if (error) return done('invalid');
    if (data?.length) return done('confirmed');
    const { data: already } = await admin.from('newsletter_subscribers').select('email').eq('token', t).maybeSingle();
    return done(already ? 'confirmed' : 'invalid');
  }

  const { data, error } = await admin.from('newsletter_subscribers').delete().eq('token', t).select('email');
  if (error) return done('invalid');
  return done(data?.length ? 'unsubscribed' : 'invalid');
}
