import { NextResponse } from 'next/server';
import { ForbiddenError, requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { downloadLabel } from '@/lib/dhl';

// "DHL-Label" in the order drawer: streams the stored label PDF from the private bucket.
export async function GET(_req: Request, ctx: RouteContext<'/owner/label/[id]'>) {
  try {
    const { supabase } = await requireOwner();
    const { id } = await ctx.params;
    const { data: o, error } = await supabase.from('orders').select('order_no, label_path').eq('id', id).single();
    if (error) throw error;
    if (!o.label_path) return NextResponse.json({ error: 'no label' }, { status: 404 });
    const pdf = await downloadLabel(createAdminClient(), o.label_path as string);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="DHL-${o.order_no}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    console.error('label', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
