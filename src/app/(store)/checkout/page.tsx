import type { Metadata } from 'next';
import { CheckoutPage, type CheckoutPrefill } from '@/components/store/pages/CheckoutPage';
import { LockedShop } from '@/components/store/LockedShop';
import { createPublicClient } from '@/lib/supabase/public';
import { loadCurrentDrop } from '@/lib/catalog';
import { isShopLocked } from '@/lib/drops';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Kasse', robots: { index: false } };

export default async function Page() {
  const drop = await loadCurrentDrop(createPublicClient());
  if (isShopLocked(drop)) return <LockedShop />;

  // Prefill from the signed-in account (replaces the prototype's tic-user localStorage entry).
  const prefill: CheckoutPrefill = { email: '', first: '', last: '', street: '', extra: '', zip: '', city: '', country: 'DE', phone: '' };
  // Read the session outside try/catch: Next.js signals dynamic rendering by throwing here.
  const { supabase, user } = await getSessionUser();
  try {
    if (user) {
      prefill.email = user.email ?? '';
      const [{ data: profile }, { data: addr }] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name').eq('id', user.id).maybeSingle(),
        supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false }).order('updated_at', { ascending: false }).limit(1),
      ]);
      prefill.first = profile?.first_name ?? '';
      prefill.last = profile?.last_name ?? '';
      const a = addr?.[0];
      if (a) Object.assign(prefill, { first: a.first_name, last: a.last_name, street: a.street, extra: a.extra, zip: a.zip, city: a.city, country: a.country, phone: a.phone });
    }
  } catch (e) {
    console.error('checkout prefill', e);
  }
  return <CheckoutPage prefill={prefill} />;
}
