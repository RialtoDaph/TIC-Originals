import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

// Keeps the auth session fresh and turns away signed-out visitors from /owner early.
// The owner role itself is verified server-side in app/owner/layout.tsx, in every owner
// server action (requireOwner) and by row level security in the database.
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  if (request.nextUrl.pathname.startsWith('/owner') && !user) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/|img/|tic-logo.png|api/stripe/webhook).*)'],
};
