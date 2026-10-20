import type { Metadata } from 'next';
import { AccountPage, type AccountData } from '@/components/store/pages/AccountPage';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Account', robots: { index: false } };

export default async function Page() {
  let data: AccountData | null = null;
  const { supabase, user } = await getSessionUser();
  if (user) {
    const [{ data: profile }, { data: orders }, { data: addresses }] = await Promise.all([
      supabase.from('profiles').select('first_name, last_name, role').eq('id', user.id).maybeSingle(),
      // RLS returns the orders placed with this account or its verified email.
      supabase
        .from('orders')
        .select('order_no, placed_at, total_cents, status, order_items(product_name, size, qty)')
        .is('deleted_at', null)
        .order('placed_at', { ascending: false }),
      supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false }).order('created_at'),
    ]);
    data = {
      email: user.email ?? '',
      first: profile?.first_name ?? '',
      last: profile?.last_name ?? '',
      isOwner: profile?.role === 'owner',
      orders: (orders ?? []).map((o) => ({
        no: o.order_no,
        placedAt: o.placed_at,
        totalCents: o.total_cents,
        status: o.status,
        items: (o.order_items as { product_name: string; size: string; qty: number }[]).map((i) => `${i.product_name} · ${i.size}${i.qty > 1 ? ' ×' + i.qty : ''}`).join(', '),
      })),
      addresses: (addresses ?? []).map((a) => ({
        id: a.id,
        isDefault: a.is_default,
        first_name: a.first_name,
        last_name: a.last_name,
        street: a.street,
        extra: a.extra,
        zip: a.zip,
        city: a.city,
        country: a.country,
        phone: a.phone,
      })),
    };
  }
  return <AccountPage data={data} />;
}
