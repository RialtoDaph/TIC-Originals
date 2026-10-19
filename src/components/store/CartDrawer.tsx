'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useStore } from './StoreProvider';
import { img } from '@/lib/images';
import s from './CartDrawer.module.css';

/** Slide-in cart. `editable` (Shop) shows quantity steppers; the Home variant lists size · ×qty. */
export function CartDrawer({ editable = true }: { editable?: boolean }) {
  const { t, cart, cartCount, cartOpen, setCartOpen, setQty, productById, price: homePrice, money, subtotalEur, settings } = useStore();
  // Only the Home page offers the USD display switch; the shop pages always show EUR.
  const price = editable ? money : homePrice;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!cartOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCartOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;
  const free = settings.freeShipCents / 100;
  const left = Math.max(0, free - subtotalEur);
  const pct = Math.min(100, (subtotalEur / free) * 100);

  return (
    <>
      <div className={s.backdrop} onClick={() => setCartOpen(false)} />
      <aside className={s.aside} role="dialog" aria-modal="true" aria-label={t.cart}>
        <div className={s.head}>
          <span className={s.title}>
            {t.cart} ({cartCount})
          </span>
          <button ref={closeRef} className={s.close} onClick={() => setCartOpen(false)} aria-label="Close">
            ×
          </button>
        </div>
        <div className={s.ship}>
          <span className={s.shipMsg}>{left > 0 ? t.shipLeft(price(left)) : t.shipFree}</span>
          <div className={s.track}>
            <div className={s.bar} style={{ width: pct + '%' }} />
          </div>
        </div>
        <div className={s.list}>
          {cart.map((c, i) => (
            <div key={c.id + c.size} className={s.line}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(productById(c.id)?.images[0])} alt="" className={s.thumb} />
              {editable ? (
                <div className={s.infoEdit}>
                  <span className={s.name}>{c.name}</span>
                  <span className={s.meta}>{c.size}</span>
                  <div className={s.qtyRow}>
                    <div className={s.stepper}>
                      <button className={s.stepBtn} onClick={() => setQty(i, -1)} aria-label="−1">
                        −
                      </button>
                      <span className={s.qty}>{c.qty}</span>
                      <button className={s.stepBtn} onClick={() => setQty(i, 1)} aria-label="+1">
                        +
                      </button>
                    </div>
                    <button className={s.remove} onClick={() => setQty(i, -c.qty)}>
                      {t.remove}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={s.info}>
                  <span className={s.name}>{c.name}</span>
                  <span className={s.meta}>
                    {c.size} · ×{c.qty}
                  </span>
                </div>
              )}
              <span className={s.price}>{price(c.eur * c.qty)}</span>
            </div>
          ))}
          {cart.length === 0 && <span className={s.empty}>{t.empty}</span>}
        </div>
        <div className={s.foot}>
          <div className={s.sub}>
            <span>{t.subtotal}</span>
            <span>{price(subtotalEur)}</span>
          </div>
          <Link href="/checkout" className={s.checkout} onClick={() => setCartOpen(false)}>
            {t.checkout}
          </Link>
        </div>
      </aside>
    </>
  );
}
