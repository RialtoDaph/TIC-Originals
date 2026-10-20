import { NextResponse } from 'next/server';
import { ForbiddenError, requireOwner } from '@/lib/auth';
import { mapOrder } from '@/lib/owner/load';
import { invoicePdf } from '@/lib/invoice';

// "Rechnung PDF" in the order drawer. Assigns the sequential invoice number on first use.
export async function GET(_req: Request, ctx: RouteContext<'/owner/invoice/[id]'>) {
  try {
    const { supabase } = await requireOwner();
    const { id } = await ctx.params;
    const { data: no, error } = await supabase.rpc('assign_invoice_no', { p_order_id: id });
    if (error) throw error;
    const { data: row, error: e2 } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).single();
    if (e2) throw e2;
    const pdf = await invoicePdf(mapOrder(row), no as string, new Date());
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Rechnung-${no}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    console.error('invoice', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
