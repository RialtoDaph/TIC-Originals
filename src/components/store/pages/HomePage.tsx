'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../StoreProvider';
import { HomeHeader } from '../Headers';
import { HomeFooter } from '../Footers';
import { CartDrawer } from '../CartDrawer';
import { CATEGORIES } from '@/lib/categories';
import { SITE_IMAGES, img } from '@/lib/images';
import type { Lang, Product } from '@/lib/types';
import { CLAIMED_CODE_KEY } from '@/lib/constants';
import s from './Home.module.css';

// [slug, grid span, aspect ratio, font size] — layout from the design.
const CAT_LAYOUT: [string, number, string, string][] = [
  ['hoodies', 3, '4/3', '46px'],
  ['sweatsuits', 3, '4/3', '46px'],
  ['t-shirts', 2, '3/4', '36px'],
  ['pants', 2, '3/4', '36px'],
  ['shorts', 2, '3/4', '36px'],
];

/** "31.10.2026" → "31.10.2026" (DE) / "31 Oct 2026" (EN); other formats are shown as typed. */
function formatUntil(v: string, lang: Lang) {
  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m || lang === 'de') return v;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function ProductTile({ p }: { p: Product }) {
  const { addToCart, price, t } = useStore();
  const [hover, setHover] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const href = '/shop/' + p.slug;
  const front = img(p.images[0]);
  const back = img(p.images[1] ?? p.images[0]);
  return (
    <div className={s.card} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Link href={href} className={s.imgLink} aria-label={p.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={front} alt={p.name} className={s.img} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={back} alt="" className={s.img} style={{ opacity: hover ? 1 : 0 }} loading="lazy" />
        {justAdded && <span className={s.added}>{t.added}</span>}
      </Link>
      <Link href={href} className={s.name}>
        {p.name}
      </Link>
      <div className={s.details}>
        <span className={s.price}>{price(p.priceCents / 100)}</span>
        <div className={s.sizes}>
          {p.variants.map((v) => (
            <button
              key={v.size}
              className={s.size}
              title={v.stock > 0 ? t.addSize : t.soldOut}
              disabled={v.stock <= 0}
              aria-label={`${p.name} ${v.size} – ${v.stock > 0 ? t.addSize : t.soldOut}`}
              onClick={() => {
                addToCart(p, v.size);
                setJustAdded(true);
                clearTimeout(timer.current);
                timer.current = setTimeout(() => setJustAdded(false), 1400);
              }}
            >
              {v.size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiscountPopup({ onClose }: { onClose: () => void }) {
  const { t, settings, lang } = useStore();
  const [claimed, setClaimed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={s.popup} role="dialog" aria-modal="true" aria-label={t.excl}>
      <div className={s.popupImgWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(SITE_IMAGES.discountPopup)} alt="" className={s.img} />
      </div>
      <div className={s.popupBody}>
        <button ref={closeRef} onClick={onClose} className={s.popupClose} aria-label="Close">
          ×
        </button>
        <div className={s.popupLogo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tic-logo.png" alt="Till I Collapse" className={s.popupLogoImg} />
        </div>
        <div className={s.popupText}>
          <span className={s.got}>{t.got}</span>
          <span className={s.excl}>{t.excl}</span>
          <span className={s.pct}>{t.pct(settings.popupPct)}</span>
        </div>
        {!claimed ? (
          <div className={s.popupCol}>
            {settings.popupUntil && <span className={s.expires}>{t.expires(formatUntil(settings.popupUntil, lang))}</span>}
            <button
              className={s.claim}
              onClick={() => {
                try {
                  localStorage.setItem(CLAIMED_CODE_KEY, settings.popupCode);
                } catch {}
                setClaimed(true);
              }}
            >
              {t.claim}
            </button>
            <button className={s.noThanks} onClick={onClose}>
              {t.noThanks}
            </button>
          </div>
        ) : (
          <div className={s.popupCol}>
            <span className={s.yourCode}>{t.yourCode}</span>
            <span className={s.code}>{settings.popupCode}</span>
            <button className={s.claimShop} onClick={onClose}>
              {t.shopNow}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function HomePage() {
  const { t, products, settings } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 700);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showTab = settings.popupEnabled && !!settings.popupCode && scrolled && !discOpen;

  return (
    <div className={s.page}>
      <HomeHeader />
      <section className={s.hero}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(SITE_IMAGES.hero)} alt="" className={s.heroImg} />
        <div className={s.noise} />
        <div className={s.fade} />
        <div className={s.heroContent}>
          <div className={s.heroTop}>
            <h1 className={s.h1}>{t.heroTitle}</h1>
            <a href="#shop" className={s.cta}>
              {t.shopNow}
            </a>
          </div>
          <div className={s.heroBottom}>
            <span className={s.available}>{t.availableNow}</span>
            <span className={s.limited}>{t.limited}</span>
          </div>
        </div>
      </section>

      <section id="shop" className={s.shop}>
        <div className={s.grid}>
          {products.map((p) => (
            <ProductTile key={p.id} p={p} />
          ))}
        </div>
        <div className={s.viewAllWrap}>
          <Link href="/shop" className={s.viewAll}>
            {t.viewAllHome}
          </Link>
        </div>
      </section>

      <section className={s.cats}>
        <div className={s.catsHead}>
          <span className={s.catsH}>{t.categories}</span>
          <Link href="/shop" className={s.underlineLink}>
            {t.viewAllHome} →
          </Link>
        </div>
        <div className={s.catGrid}>
          {CAT_LAYOUT.map(([slug, span, ratio, size]) => {
            const name = CATEGORIES.find((c) => c.slug === slug)!.label;
            return (
              <Link key={slug} href={'/shop/' + slug} className={s.cat} style={{ gridColumn: `span ${span}`, aspectRatio: ratio }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(SITE_IMAGES.categories[slug])} alt={name} className={s.img} loading="lazy" />
                <div className={s.catShade} />
                <div className={s.catBody}>
                  <span className={s.catName} style={{ fontSize: size }}>
                    {name}
                  </span>
                  <span className={s.catCta}>{t.shopNow}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={s.trust}>
        {t.trust.map((tr) => (
          <div key={tr.h} className={s.trustItem}>
            <span className={s.trustH}>{tr.h}</span>
            <span className={s.trustP}>{tr.p}</span>
          </div>
        ))}
      </section>

      <HomeFooter />

      {showTab && (
        <button className={s.tab} onClick={() => setDiscOpen(true)}>
          {t.tab(settings.popupPct)}
        </button>
      )}
      {discOpen && <DiscountPopup onClose={() => setDiscOpen(false)} />}
      <CartDrawer editable={false} />
    </div>
  );
}
