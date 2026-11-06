import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { priceCart, sanitizeItems } from '@/lib/checkout';
import { COUNTRY_CODES } from '@/lib/countries';
import { allowRequest } from '@/lib/rate-limit';

// Quote a discount code for the current cart ("Einlösen" at checkout). The first-order rule is
// checked when the order is placed, so this public endpoint can't reveal who is already a customer.
export async function POST(req: Request) {
  const admin = createAdminClient();
  if (!(await allowRequest(admin, 'discount', req.headers, 60, 600))) {
    return NextResponse.json({ ok: false, problem: 'unknown' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase().slice(0, 40) : '';
  if (!code) return NextResponse.json({ ok: false, problem: 'unknown' });
  const country = COUNTRY_CODES.includes(body.country) ? body.country : 'DE';
  const result = await priceCart(admin, { items: sanitizeItems(body.items), code, country });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error, name: result.name, size: result.size });
  if (result.codeProblem || !result.code) {
    return NextResponse.json({ ok: false, problem: result.codeProblem ?? 'unknown', minCents: result.codeMinCents });
  }
  return NextResponse.json({
    ok: true,
    code: result.code.code,
    isPercent: result.code.isPercent,
    value: result.code.value,
    totals: result.totals,
  });
}
