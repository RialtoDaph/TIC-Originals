import 'server-only';
import Stripe from 'stripe';
import { serverEnv } from './env';

let client: Stripe | null = null;

export function stripe() {
  if (!client) {
    // STRIPE_API_BASE is only for local tests (points the SDK at tests/dev/gateway.mjs).
    const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
    client = new Stripe(
      serverEnv.stripeSecretKey(),
      base ? { host: base.hostname, port: Number(base.port), protocol: base.protocol.replace(':', '') as 'http' | 'https' } : undefined,
    );
  }
  return client;
}

/** Human-readable payment method for the dashboard ("Card (Stripe)", "PayPal", …). */
export function paymentMethodLabel(pm: Stripe.PaymentMethod | string | null | undefined): string {
  if (!pm || typeof pm === 'string') return '';
  if (pm.type === 'card') {
    const wallet = pm.card?.wallet?.type;
    if (wallet === 'apple_pay') return 'Apple Pay';
    if (wallet === 'google_pay') return 'Google Pay';
    return 'Card (Stripe)';
  }
  const names: Record<string, string> = { paypal: 'PayPal', klarna: 'Klarna', sepa_debit: 'SEPA', link: 'Link' };
  return names[pm.type] ?? pm.type;
}
