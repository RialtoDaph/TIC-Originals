'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from './StoreProvider';
import { LangToggle } from './LangToggle';
import { AccountIcon, LockIcon, TICKER_ICONS, TickerIcon } from './icons';
import { CATEGORIES } from '@/lib/categories';
import s from './Header.module.css';

const NAV = [{ slug: 'all', label: 'Shop All' }, ...CATEGORIES];
const navHref = (slug: string) => (slug === 'all' ? '/shop' : '/shop/' + slug);

function Logo({ big = false }: { big?: boolean }) {
  return (
    <Link href="/" className={big ? s.homeLogo : s.logoLink} aria-label="TIC Originals – Home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tic-logo.png" alt="Till I Collapse" className={big ? s.homeLogoImg : s.logoImg} />
    </Link>
  );
}

/** Rotating announcement bar (left/right messages come from Settings → Announcement bar). */
function Ticker() {
  const { settings } = useStore();
  const [idx, setIdx] = useState(0);
  const paused = useRef({ l: false, r: false });
  const left = settings.annLeft.filter(Boolean);
  const right = settings.annRight.filter(Boolean);

  useEffect(() => {
    const id = setInterval(() => {
      if (!paused.current.l && !paused.current.r) setIdx((i) => i + 1);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const li = left.length ? idx % left.length : 0;
  const ri = right.length ? idx % right.length : 0;
  const [a, ...rest] = (left[li] ?? '').split(' · ');
  return (
    <div className={s.ticker}>
      <div className={s.tickerSlot} onMouseEnter={() => (paused.current.l = true)} onMouseLeave={() => (paused.current.l = false)} aria-live="off">
        {left.length > 0 && (
          <div key={'L' + li} className={s.tickerL}>
            <TickerIcon d={TICKER_ICONS.left[li % 3]} />
            <span>{a}</span>
            {rest.length > 0 && <span className={s.tickerLb}>{rest.join(' · ')}</span>}
          </div>
        )}
      </div>
      <div className={s.tickerSlot} onMouseEnter={() => (paused.current.r = true)} onMouseLeave={() => (paused.current.r = false)} aria-live="off">
        {right.length > 0 && (
          <div key={'R' + ri} className={s.tickerR}>
            <TickerIcon d={TICKER_ICONS.right[ri % 3]} />
            {right[ri]}
          </div>
        )}
      </div>
    </div>
  );
}

export function HomeHeader() {
  const { t, cartCount, setCartOpen, currency, setCurrency } = useStore();
  const [curOpen, setCurOpen] = useState(false);
  const curs = [
    { k: 'EUR' as const, l: '🇩🇪  EUR (€)' },
    { k: 'USD' as const, l: '🇺🇸  USD ($)' },
  ];
  return (
    <>
      <Ticker />
      <header className={s.homeHeader}>
        <Logo big />
        <nav className={s.nav} aria-label="Shop">
          {NAV.map((n) => (
            <Link key={n.slug} href={navHref(n.slug)} className={s.homeNavLink}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className={s.right}>
          <Link href="/account" title="Account" className={s.iconLink} aria-label="Account">
            <AccountIcon size={24} />
          </Link>
          <LangToggle />
          <div className={s.cur}>
            <button className={s.curBtn} onClick={() => setCurOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={curOpen}>
              <span style={{ whiteSpace: 'nowrap' }}>{curs.find((c) => c.k === currency)!.l}</span>
              <span className={s.curCaret}>▾</span>
            </button>
            {curOpen && (
              <div className={s.curMenu} role="listbox">
                {curs.map((c) => (
                  <button
                    key={c.k}
                    role="option"
                    aria-selected={c.k === currency}
                    className={`${s.curOpt} ${c.k === currency ? s.curOptActive : ''}`}
                    onClick={() => {
                      setCurrency(c.k);
                      setCurOpen(false);
                    }}
                  >
                    {c.l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className={s.cartBtn} onClick={() => setCartOpen(true)}>
            {t.cart} ({cartCount})
          </button>
        </div>
      </header>
    </>
  );
}

/** Header used by Shop (with strip + active underline), Account and Policies. */
export function StoreHeader({ variant, active }: { variant: 'shop' | 'account' | 'policies'; active?: string }) {
  const { t, cartCount, setCartOpen, amount, settings } = useStore();
  return (
    <>
      {variant === 'shop' && (
        <div className={s.strip}>
          {t.strip(amount(settings.freeShipCents)).map((x) => (
            <span key={x} className={s.stripItem}>
              <span className={s.stripDot} />
              {x}
            </span>
          ))}
        </div>
      )}
      <header className={`${s.header} ${variant !== 'account' ? s.sticky : ''} ${variant === 'policies' ? s.policiesGap : ''}`}>
        <Logo />
        <nav className={s.nav} aria-label="Shop">
          {NAV.map((n) =>
            variant === 'shop' ? (
              <Link key={n.slug} href={navHref(n.slug)} className={`${s.navLinkLine} ${active === n.slug ? s.navLinkActive : ''}`} aria-current={active === n.slug ? 'page' : undefined}>
                {n.label}
              </Link>
            ) : (
              <Link key={n.slug} href={navHref(n.slug)} className={s.navLink}>
                {n.label}
              </Link>
            ),
          )}
        </nav>
        <div className={s.right}>
          {variant === 'shop' && (
            <>
              <LangToggle />
              <Link href="/account" title="Account" className={s.iconLink} aria-label="Account">
                <AccountIcon size={22} />
              </Link>
              <button className={s.cartBtn} onClick={() => setCartOpen(true)}>
                {t.cart} ({cartCount})
              </button>
            </>
          )}
          {variant === 'account' && (
            <>
              <LangToggle />
              <Link href="/checkout" className={s.cartLink15}>
                {t.cart} ({cartCount})
              </Link>
            </>
          )}
          {variant === 'policies' && (
            <>
              <LangToggle />
              <Link href="/account" aria-label="Account" className={s.iconLink}>
                <AccountIcon size={20} variant="policies" />
              </Link>
              <Link href="/checkout" className={s.cartLink14}>
                {t.cartLabel}
              </Link>
            </>
          )}
        </div>
      </header>
    </>
  );
}

export function CheckoutHeader() {
  const { t } = useStore();
  return (
    <header className={s.checkoutHeader}>
      <Link href="/shop" className={s.back}>
        ← {t.back}
      </Link>
      <Link href="/" className={s.checkoutLogo} aria-label="TIC Originals – Home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tic-logo.png" alt="Till I Collapse" className={s.logoImg} />
      </Link>
      <div className={s.checkoutRight}>
        <span className={s.secure}>
          <LockIcon />
          <span>{t.secure}</span>
        </span>
        <LangToggle />
      </div>
    </header>
  );
}
