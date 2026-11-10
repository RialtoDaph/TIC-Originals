'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useStore } from './StoreProvider';
import { useDialog } from './dialog';
import { Photo } from './Photo';
import { preorderDate } from '@/lib/preorder';
import s from './CartDrawer.module.css';

/** Slide-in cart with quantity steppers; amounts follow the display currency (checkout charges EUR). */
export function CartDrawer() {
  const { t, lang, cart, cartCount, cartOpen, setCartOpen, setQty, productById, price, currency, subtotalEur, settings } = useStore();
  const asideRef = useRef<HTMLElement>(null);
  // Stays mounted after closing until the slide-out animation has finished.
  const [mounted, setMounted] = useState(cartOpen);
  if (cartOpen && !mounted) setMounted(true);
  useDialog(asideRef, cartOpen && mounted, () => setCartOpen(false));

  if (!mounted) return null;
  const state = cartOpen ? 'open' : 'closed';
  const free = settings.freeShipCents / 100;
  const left = Math.max(0, free - subtotalEur);
  const pct = Math.min(100, (subtotalEur / free) * 100);

  return (
    <>
      <div className={s.backdrop} data-state={state} onClick={() => setCartOpen(false)} />
      <aside
        ref={asideRef}
        className={s.aside}
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label={t.cart}
        tabIndex={-1}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && !cartOpen) setMounted(false);
        }}
      >
        <div className={s.head}>
          <span className={s.title}>
            {t.cart} ({cartCount})
          </span>
          <button data-autofocus className={s.close} onClick={() => setCartOpen(false)} aria-label={t.close}>
            ×
          </button>
        </div>
        <div className={s.ship}>
          <span className={s.shipMsg}>{left > 0 ? t.shipLeft(price(left)) : t.shipFree}</span>
          <div className={s.track}>
            <div className={s.bar} style={{ width: pct + '%' }} />
          </div>
        </div>
        <div className={s.list} data-lenis-prevent>
          {cart.map((c, i) => (
            <div key={c.id + c.size} className={s.line} style={{ '--i': i } as React.CSSProperties}>
              <Photo src={productById(c.id)?.images[0]} alt="" className={s.thumb} sizes="72px" width={72} height={80} />
              <div className={s.infoEdit}>
                <span className={s.name}>{c.name}</span>
                <span className={s.meta}>
                  {c.size}
                  {preorderDate(productById(c.id), lang) ? ' · ' + t.preorderShips(preorderDate(productById(c.id), lang)!) : ''}
                </span>
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
          {currency === 'USD' && <span className={s.eurNote}>{t.chargedEur}</span>}
          <Link href="/checkout" className={s.checkout} onClick={() => setCartOpen(false)}>
            {t.checkout}
          </Link>
        </div>
      </aside>
    </>
  );
}
