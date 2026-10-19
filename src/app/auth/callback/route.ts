import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// OAuth (Google) and email-link (password reset) return here with a one-time code.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/account';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account';
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
    console.error('auth callback', error);
  }
  return NextResponse.redirect(new URL('/account?error=auth', url.origin));
}
