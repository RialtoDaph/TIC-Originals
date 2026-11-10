'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from './StoreProvider';
import { LangToggle } from './LangToggle';
import { CartDrawer } from './CartDrawer';
import { AccountIcon, BagIcon, LockIcon, TICKER_ICONS, TickerIcon } from './icons';
import s from './Header.module.css';

function useNav() {
  const { categories } = useStore();
  return [{ slug: 'all', label: 'Shop All' }, ...categories];
}
const navHref = (slug: string) => (slug === 'all' ? '/shop' : '/shop/' + slug);

function Logo({ big = false }: { big?: boolean }) {
  return (
    <Link href="/" className={big ? s.homeLogo : s.logoLink} aria-label="TIC Originals – Home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tic-logo-blue.png" alt="TIC Originals" className={big ? s.homeLogoImg : s.logoImg} />
    </Link>
  );
}

/** Matches a media query on the client (false during SSR and the first render). */
function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** "Warenkorb (2)" on wide screens, a bag with a count on phones; the count pops when items are added. */
function CartButton() {
  const { t, cartCount, cartLoaded, setCartOpen } = useStore();
  const [prev, setPrev] = useState(cartCount);
  const [bump, setBump] = useState(0);
  const [wasLoaded, setWasLoaded] = useState(cartLoaded);
  if (cartCount !== prev) {
    setPrev(cartCount);
    // Not when the saved cart is first read from storage, only when something is added.
    if (cartCount > prev && wasLoaded) setBump((b) => b + 1);
  }
  if (cartLoaded !== wasLoaded) setWasLoaded(cartLoaded);
  return (
    <button className={s.cartBtn} onClick={() => setCartOpen(true)} aria-label={`${t.cart} (${cartCount})`}>
      <span className={s.cartText}>{t.cart} </span>
      <span className={s.cartIcon}>
        <BagIcon />
      </span>
      <span key={bump} className={`${s.cartCount} ${bump ? s.cartBump : ''}`} data-empty={cartCount === 0}>
        <span className={s.paren}>(</span>
        {cartCount}
        <span className={s.paren}>)</span>
      </span>
    </button>
  );
}

/** Rotating announcement bar (left/right messages come from Settings → Announcement bar). */
function Ticker() {
  const { settings } = useStore();
  const [idx, setIdx] = useState(0);
  // Paused while hovered, while focus or a finger is on it, and while the tab is hidden.
  const paused = useRef({ l: false, r: false, f: false });
  const narrow = useMedia('(max-width: 700px)');
  // Phones get one line that rotates through both sides' messages.
  const left = narrow ? [...settings.annLeft, ...settings.annRight].filter(Boolean) : settings.annLeft.filter(Boolean);
  const right = narrow ? [] : settings.annRight.filter(Boolean);

  useEffect(() => {
    // Reduced motion: the first messages stay put instead of rotating.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      if (!paused.current.l && !paused.current.r && !paused.current.f && !document.hidden) setIdx((i) => i + 1);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const li = left.length ? idx % left.length : 0;
  const ri = right.length ? idx % right.length : 0;
  // "Main · detail": the detail is set smaller on wide screens; phones show the line as one.
  const [a, ...rest] = narrow ? [left[li] ?? ''] : (left[li] ?? '').split(' · ');
  return (
    <div
      className={s.ticker}
      onFocus={() => (paused.current.f = true)}
      onBlur={() => (paused.current.f = false)}
      onPointerDown={() => (paused.current.f = !paused.current.f)}
    >
      <div className={s.tickerSlot} onMouseEnter={() => (paused.current.l = true)} onMouseLeave={() => (paused.current.l = false)} aria-live="off">
        {left.length > 0 && (
          <div key={'L' + li} className={s.tickerL}>
            <TickerIcon d={TICKER_ICONS.left[li % 3]} />
            <span>{a}</span>
            {rest.length > 0 && <span className={s.tickerLb}>{rest.join(' · ')}</span>}
          </div>
        )}
      </div>
      <div className={`${s.tickerSlot} ${s.tickerSlotR}`} onMouseEnter={() => (paused.current.r = true)} onMouseLeave={() => (paused.current.r = false)} aria-live="off">
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

/** EUR/USD display switch (wide screens only, see Header.module.css). */
function CurrencySelect() {
  const { currency, setCurrency } = useStore();
  const [curOpen, setCurOpen] = useState(false);
  const curRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!curOpen) return;
    const onDown = (e: PointerEvent) => !curRef.current?.contains(e.target as Node) && setCurOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCurOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [curOpen]);
  const curs = [
    { k: 'EUR' as const, l: '🇩🇪  EUR (€)' },
    { k: 'USD' as const, l: '🇺🇸  USD ($)' },
  ];
  return (
    <div className={s.cur} ref={curRef}>
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
  );
}

export function HomeHeader() {
  const NAV = useNav();
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
          <CurrencySelect />
          <CartButton />
        </div>
      </header>
    </>
  );
}

/** Header used by Shop (with strip + active underline), Account and Policies. */
export function StoreHeader({ variant, active }: { variant: 'shop' | 'account' | 'policies'; active?: string }) {
  const { t, amount, settings } = useStore();
  const NAV = useNav();
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // The nav scrolls sideways on narrow screens: keep the current category visible.
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && el && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, el.offsetLeft - nav.offsetLeft - 40);
  }, [active]);
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
        <nav className={s.nav} aria-label="Shop" ref={navRef}>
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
              <CurrencySelect />
              <Link href="/account" title="Account" className={s.iconLink} aria-label="Account">
                <AccountIcon size={22} />
              </Link>
              <CartButton />
            </>
          )}
          {variant === 'account' && (
            <>
              <LangToggle />
              <CartButton />
            </>
          )}
          {variant === 'policies' && (
            <>
              <LangToggle />
              <Link href="/account" aria-label="Account" className={s.iconLink}>
                <AccountIcon size={20} variant="policies" />
              </Link>
              <CartButton />
            </>
          )}
        </div>
      </header>
      {/* Shop pages render their own drawer; elsewhere the header brings it along. */}
      {variant !== 'shop' && <CartDrawer />}
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
        <img src="/tic-logo-blue.png" alt="TIC Originals" className={s.logoImg} />
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
