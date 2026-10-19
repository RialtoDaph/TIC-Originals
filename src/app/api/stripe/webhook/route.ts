import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, paymentMethodLabel } from '@/lib/stripe';
import { serverEnv } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { afterOrderEvent } from '@/lib/order-events';

// Stripe webhook. Configure in Stripe → Developers → Webhooks with the events
// payment_intent.processing, payment_intent.succeeded, payment_intent.payment_failed and charge.refunded.
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig ?? '', serverEnv.stripeWebhookSecret());
  } catch (e) {
    console.warn('[webhook] bad signature', e);
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    switch (event.type) {
      case 'payment_intent.processing':
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const status = event.type === 'payment_intent.succeeded' ? 'succeeded' : event.type === 'payment_intent.processing' ? 'processing' : 'failed';
        let method = '';
        if (pi.payment_method) {
          const pm = typeof pi.payment_method === 'string' ? await stripe().paymentMethods.retrieve(pi.payment_method) : pi.payment_method;
          method = paymentMethodLabel(pm);
        }
        const { data: exists } = await admin.from('checkouts').select('id').eq('payment_intent_id', pi.id).maybeSingle();
        if (!exists) break; // Not one of ours (e.g. created in the Stripe dashboard).
        const { data, error } = await admin.rpc('finalize_checkout', { p_payment_intent: pi.id, p_status: status, p_method: method });
        if (error) throw error;
        const result = data as { order_id: string | null; event: string };
        if (result.order_id && result.event !== 'noop') {
          // The order state is already committed; emails/notifications must not trigger a retry.
          await afterOrderEvent(admin, result.order_id, result.event).catch((e) => console.error('[webhook] side effects failed', e));
        }
        break;
      }
      case 'charge.refunded': {
        // Refunds made directly in the Stripe dashboard.
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        if (!piId) break;
        await admin
          .from('orders')
          .update({
            refunded_cents: charge.amount_refunded,
            ...(charge.refunded ? { payment_status: 'refunded', refunded_at: new Date().toISOString() } : {}),
          })
          .eq('payment_intent_id', piId);
        break;
      }
    }
  } catch (e) {
    console.error('[webhook] handler failed', event.type, e);
    // Non-2xx makes Stripe retry; finalize_checkout is idempotent.
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
