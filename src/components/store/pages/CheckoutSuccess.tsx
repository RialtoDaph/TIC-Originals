'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useStore } from '../StoreProvider';
import { CheckoutHeader } from '../Headers';
import { CheckoutFooter } from '../Footers';
import { CLAIMED_CODE_KEY } from '@/lib/constants';
import s from './Checkout.module.css';

export function CheckoutSuccess({ state, orderNo, email }: { state: 'ok' | 'pending' | 'failed' | 'unknown'; orderNo: string; email: string }) {
  const { t, clearCart, cartLoaded } = useStore();
  const placed = state === 'ok' || state === 'pending';

  useEffect(() => {
    if (!placed || !cartLoaded) return;
    clearCart();
    try {
      localStorage.removeItem(CLAIMED_CODE_KEY);
    } catch {}
  }, [placed, cartLoaded, clearCart]);

  return (
    <div className={s.page}>
      <CheckoutHeader />
      {placed ? (
        <main className={s.done}>
          <div className={s.doneInner}>
            <span className={s.orderNo}>
              {t.orderNo} {orderNo}
            </span>
            <h1 className={s.thanks}>{t.thanks}</h1>
            <p className={s.doneP}>{t.done(email)}</p>
            {state === 'pending' && <p className={s.doneP}>{t.pendingPayment}</p>}
            <div className={s.steps}>
              {t.next.map((n) => (
                <div key={n.n} className={s.step}>
                  <span className={s.stepN}>{n.n}</span>
                  <span>{n.p}</span>
                </div>
              ))}
            </div>
            <div className={s.doneBtns}>
              <Link href="/policies/tracking" className={s.trackBtn}>
                Track Order
              </Link>
              <Link href="/shop" className={s.outlineBtn}>
                {t.keepShopping}
              </Link>
            </div>
          </div>
        </main>
      ) : (
        // Payment failed or was cancelled at PayPal/Klarna: the cart is kept so the shopper can retry.
        <main className={s.empty}>
          <h1 className={s.emptyH}>{t.title}</h1>
          <p className={s.emptyP} role="alert">
            {state === 'failed' ? t.payFailed : t.genericError}
          </p>
          <Link href="/checkout" className={s.cyanBtn}>
            {t.retry}
          </Link>
        </main>
      )}
      <CheckoutFooter />
    </div>
  );
}
