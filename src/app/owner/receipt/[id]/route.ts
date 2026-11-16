import { NextResponse } from 'next/server';
import { ForbiddenError, requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// "Rechnung öffnen" in the Finanzen tab. The receipt row is read with the owner's own session (RLS),
// then the browser is sent to a short-lived signed URL, so the file itself never passes through a
// serverless function (receipts can be 10 MB, above the function body limit).
export async function GET(_req: Request, ctx: RouteContext<'/owner/receipt/[id]'>) {
  try {
    const { supabase } = await requireOwner();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const { data: r, error } = await supabase.from('expense_receipts').select('path').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const { data: signed, error: signErr } = await createAdminClient().storage.from('receipts').createSignedUrl(r.path as string, 60);
    if (signErr || !signed) throw signErr ?? new Error('sign failed');
    const res = NextResponse.redirect(signed.signedUrl, 302);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    console.error('receipt', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
