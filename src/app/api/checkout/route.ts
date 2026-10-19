import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { priceCart, sanitizeItems } from '@/lib/checkout';
import { addressErrors, cleanAddress } from '@/lib/validation';
import { stripe } from '@/lib/stripe';
import { loadCurrentDrop } from '@/lib/catalog';
import { isShopLocked } from '@/lib/drops';

/**
 * Called when the shopper clicks "Zahlungspflichtig bestellen". Re-prices the cart on the server,
 * stores a pending checkout and creates (or updates, on retry) the Stripe PaymentIntent whose
 * client secret the Payment Element then confirms. The order itself is only created by the
 * Stripe webhook once the payment is processing (SEPA) or has succeeded.
 */
export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    console.error('[checkout]', e);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

async function handle(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const addr = cleanAddress(body);
  if (Object.keys(addressErrors(addr)).length) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const lang = body.lang === 'en' ? 'en' : 'de';
  const items = sanitizeItems(body.items);
  const admin = createAdminClient();

  if (isShopLocked(await loadCurrentDrop(admin))) return NextResponse.json({ error: 'locked' }, { status: 409 });

  const priced = await priceCart(admin, { items, code: body.code ?? null, email: addr.email, country: addr.country });
  if (!priced.ok) return NextResponse.json({ error: priced.error, name: priced.name, size: priced.size }, { status: 409 });
  if (body.code && priced.codeProblem) {
    return NextResponse.json({ error: 'code', problem: priced.codeProblem, minCents: priced.codeMinCents }, { status: 409 });
  }
  const { totals } = priced;
  if (totals.totalCents !== body.expectedTotalCents) {
    return NextResponse.json({ error: 'changed', totals }, { status: 409 });
  }

  // Link the order to the signed-in account (if any).
  let userId: string | null = null;
  try {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    userId = user?.id ?? null;
  } catch {}

  const row = {
    user_id: userId,
    email: addr.email,
    first_name: addr.first,
    last_name: addr.last,
    street: addr.street,
    extra: addr.extra,
    zip: addr.zip,
    city: addr.city,
    country: addr.country,
    phone: addr.phone,
    newsletter: !!body.newsletter,
    lang,
    items: priced.lines,
    subtotal_cents: totals.subtotalCents,
    discount_code: priced.code?.code ?? null,
    discount_cents: totals.discountCents,
    shipping_cents: totals.shippingCents,
    total_cents: totals.totalCents,
  };
  const shipping = {
    name: `${addr.first} ${addr.last}`,
    phone: addr.phone || undefined,
    address: { line1: addr.street, line2: addr.extra || undefined, postal_code: addr.zip, city: addr.city, country: addr.country },
  };

  // Retry after a declined payment: reuse the open checkout and its PaymentIntent.
  if (typeof body.checkoutId === 'string') {
    const { data: existing } = await admin.from('checkouts').select('id, order_no, payment_intent_id, status').eq('id', body.checkoutId).maybeSingle();
    if (existing && (existing.status === 'open' || existing.status === 'failed') && existing.payment_intent_id) {
      const pi = await stripe().paymentIntents.retrieve(existing.payment_intent_id);
      if (pi.status === 'requires_payment_method' || pi.status === 'requires_confirmation' || pi.status === 'requires_action') {
        const updated = await stripe().paymentIntents.update(pi.id, { amount: totals.totalCents, shipping });
        await admin.from('checkouts').update({ ...row, status: 'open' }).eq('id', existing.id);
        return NextResponse.json({ clientSecret: updated.client_secret, checkoutId: existing.id, orderNo: existing.order_no });
      }
    }
  }

  const { data: orderNo, error: noErr } = await admin.rpc('gen_order_no');
  if (noErr) throw noErr;
  const { data: checkout, error: insErr } = await admin.from('checkouts').insert({ ...row, order_no: orderNo }).select('id').single();
  if (insErr) throw insErr;

  const pi = await stripe().paymentIntents.create(
    {
      amount: totals.totalCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      description: `TIC Originals ${orderNo}`,
      shipping,
      metadata: { order_no: orderNo as string, checkout_id: checkout.id },
    },
    { idempotencyKey: `checkout-${checkout.id}` },
  );
  await admin.from('checkouts').update({ payment_intent_id: pi.id }).eq('id', checkout.id);
  return NextResponse.json({ clientSecret: pi.client_secret, checkoutId: checkout.id, orderNo });
}
