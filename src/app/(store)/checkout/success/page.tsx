import type { Metadata } from 'next';
import { CheckoutSuccess } from '@/components/store/pages/CheckoutSuccess';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Danke', robots: { index: false } };

/** Return page after payment (also the Stripe redirect target for PayPal/Klarna/3-D Secure). */
export default async function Page({ searchParams }: PageProps<'/checkout/success'>) {
  const sp = await searchParams;
  const piId = typeof sp.payment_intent === 'string' ? sp.payment_intent : '';
  let state: 'ok' | 'pending' | 'failed' | 'unknown' = 'unknown';
  let orderNo = '';
  let email = '';
  if (/^pi_[A-Za-z0-9_]+$/.test(piId)) {
    try {
      const pi = await stripe().paymentIntents.retrieve(piId);
      state = pi.status === 'succeeded' ? 'ok' : pi.status === 'processing' ? 'pending' : pi.status === 'requires_payment_method' ? 'failed' : 'unknown';
      const { data } = await createAdminClient().from('checkouts').select('order_no, email').eq('payment_intent_id', piId).maybeSingle();
      orderNo = data?.order_no ?? '';
      email = data?.email ?? '';
    } catch (e) {
      console.error('success page', e);
    }
  }
  return <CheckoutSuccess state={state} orderNo={orderNo} email={email} />;
}
