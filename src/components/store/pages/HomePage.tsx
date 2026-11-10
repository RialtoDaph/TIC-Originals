'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../StoreProvider';
import { HomeHeader } from '../Headers';
import { HomeFooter } from '../Footers';
import { CartDrawer } from '../CartDrawer';
import { categoryLabel } from '@/lib/categories';
import { colorsOf, onePerModel } from '@/lib/models';
import { ColorDots } from '../Swatches';
import { SITE_IMAGES, img } from '@/lib/images';
import type { Lang, Product } from '@/lib/types';
import { CLAIMED_CODE_KEY } from '@/lib/constants';
import { useParallax } from '../useParallax';
import { useDialog } from '../dialog';
import { Photo } from '../Photo';

const TILE_SIZES = '(max-width: 700px) 50vw, 33vw';
import s from './Home.module.css';

// [slug, grid span, aspect ratio, font size] — layout from the design.
const CAT_LAYOUT: [string, number, string, string][] = [
  ['hoodies', 3, '4/3', '46px'],
  ['sweatsuits', 3, '4/3', '46px'],
  ['t-shirts', 2, '3/4', '36px'],
  ['pants', 2, '3/4', '36px'],
  ['shorts', 2, '3/4', '36px'],
];

/**
 * Category tiles on a 6-column grid: the design layout when exactly the design's categories have
 * products, otherwise rows of two wide tiles (span 3) and three narrow ones (span 2) with no gaps.
 */
function categoryTiles(slugs: string[]): [string, number, string, string][] {
  if (slugs.length === CAT_LAYOUT.length && CAT_LAYOUT.every(([slug]) => slugs.includes(slug))) return CAT_LAYOUT;
  const n = slugs.length;
  const wide = n === 1 ? 0 : n % 3 === 2 ? 2 : n % 3 === 1 ? 4 : 0;
  return slugs.map((slug, i) =>
    n === 1 ? [slug, 6, '16/7', '46px'] : i < wide ? [slug, 3, '4/3', '46px'] : [slug, 2, '3/4', '36px'],
  );
}

/** Desktop columns for the product grid, chosen so the last row is never a lone card. */
function gridCols(n: number) {
  if (n % 3 === 0 || n % 3 === 2) return 3;
  if (n % 4 === 0 || n % 4 === 3) return 4;
  return 3;
}

/** "31.10.2026" → "31.10.2026" (DE) / "31 Oct 2026" (EN); other formats are shown as typed. */
function formatUntil(v: string, lang: Lang) {
  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m || lang === 'de') return v;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Looping hero video; the poster stays visible when it can't play or the visitor prefers reduced motion. */
function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // React sets `muted` as a property only, so browsers won't autoplay from the server HTML.
    v.muted = true;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (!saveData && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) v.play().catch(() => {});
  }, []);
  return (
    <video ref={ref} poster={img(SITE_IMAGES.hero)} className={s.heroVideo} muted loop playsInline preload="none" aria-hidden="true">
      {/* Phones get a smaller portrait crop (~0.3 MB instead of ~0.9 MB). */}
      <source src={img(SITE_IMAGES.heroVideoMobile)} type="video/mp4" media="(max-width: 700px)" />
      <source src={img(SITE_IMAGES.heroVideo)} type="video/mp4" />
    </video>
  );
}

function ProductTile({ p, index }: { p: Product; index: number }) {
  const { addToCart, price, t, products } = useStore();
  const colors = colorsOf(p, products);
  const [hover, setHover] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const href = '/shop/' + p.slug;
  return (
    <div className={s.card} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} data-reveal="quick" style={{ '--reveal-delay': `${(index % 3) * 0.05}s` } as React.CSSProperties}>
      <Link href={href} className={`${s.imgLink} tic-zoom`} aria-label={p.name}>
        <Photo src={p.images[0]} alt={p.name} className={s.img} sizes={TILE_SIZES} />
        <Photo src={p.images[1] ?? p.images[0]} alt="" className={s.img} style={{ opacity: hover ? 1 : 0 }} sizes={TILE_SIZES} />
        {justAdded && <span className={s.added}>{t.added}</span>}
      </Link>
      <Link href={href} className={s.name}>
        {p.name}
      </Link>
      <ColorDots colors={colors} label={t.colorsN(colors.length)} />
      <div className={s.details}>
        <span className={s.price}>
          {price(p.priceCents / 100)}
          {p.preorder ? ' · ' + t.preorder : ''}
        </span>
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
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, true, onClose);
  return (
    <div ref={ref} className={s.popup} role="dialog" aria-modal="true" aria-label={t.excl} data-lenis-prevent>
      <div className={s.popupImgWrap}>
        <Photo src={SITE_IMAGES.discountPopup} alt="" className={s.img} sizes="(max-width: 920px) 100vw, 50vw" />
      </div>
      <div className={s.popupBody}>
        <button data-autofocus onClick={onClose} className={s.popupClose} aria-label={t.close}>
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

/** Slow ticker between sections. */
function Marquee({ text }: { text: string }) {
  const items = Array.from({ length: 6 }, () => text);
  return (
    <div className={s.marquee} aria-hidden="true">
      <div className={s.marqueeTrack}>
        {[...items, ...items].map((x, i) => (
          <span key={i} className={s.marqueeItem}>
            {x}
            <span className={s.marqueeDot} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Drop 002 editorial: lookbook photos with layered parallax and image reveals. */
function Lookbook() {
  const { t } = useStore();
  const side = useParallax<HTMLDivElement>(0.12);
  const detail = useParallax<HTMLDivElement>(-0.08);
  const L = SITE_IMAGES.lookbook;
  return (
    <section className={s.look} aria-labelledby="lookbook-h">
      <div className={s.lookGrid}>
        <Link href="/shop/sweater" className={`${s.lookLead} tic-zoom`} data-reveal="img" aria-label={t.lookCta}>
          <Photo src={L.lead} alt="" className={s.lookImg} sizes="(max-width: 900px) 100vw, 50vw" />
        </Link>
        <div className={s.lookCopy}>
          <span className={s.lookEyebrow} data-reveal>
            {t.lookEyebrow}
          </span>
          <h2 id="lookbook-h" className={s.lookH} data-reveal="mask" style={{ '--reveal-delay': '0.1s' } as React.CSSProperties}>
            {t.lookTitle}
          </h2>
          <p className={s.lookP} data-reveal style={{ '--reveal-delay': '0.2s' } as React.CSSProperties}>
            {t.lookText}
          </p>
          <Link href="/shop" className={s.lookCta} data-reveal style={{ '--reveal-delay': '0.3s' } as React.CSSProperties}>
            <span>{t.lookCta}</span>
            <span className={s.lookArrow} aria-hidden="true">
              →
            </span>
          </Link>
          <div ref={detail} className={s.lookDetailWrap}>
            <Link href="/shop/pants" className={`${s.lookDetail} tic-zoom`} data-reveal="img" style={{ '--reveal-delay': '0.15s' } as React.CSSProperties} aria-label="Chosen Sweatpants">
              <Photo src={L.detail} alt="" className={s.lookImg} sizes="20vw" />
            </Link>
          </div>
        </div>
        <div ref={side} className={s.lookSideWrap}>
          <div className={`${s.lookSide} tic-zoom`} data-reveal="img" style={{ '--reveal-delay': '0.2s' } as React.CSSProperties}>
            <Photo src={L.side} alt="" className={s.lookImg} sizes="25vw" />
          </div>
        </div>
      </div>
      <div className={s.lookStrip}>
        {L.strip.map((src, i) => (
          <div key={src} className={`${s.lookStripItem} tic-zoom`} data-reveal="img" style={{ '--reveal-delay': `${i * 0.1}s` } as React.CSSProperties}>
            <Photo src={src} alt="" className={s.lookImg} sizes="(max-width: 700px) 72vw, 25vw" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  const { t, products, settings, categories } = useStore();
  const catTiles = categoryTiles(categories.map((c) => c.slug));
  const [scrolled, setScrolled] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 700);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tiles = onePerModel(products);
  const showTab = settings.popupEnabled && !!settings.popupCode && scrolled && !discOpen;
  const heroMedia = useParallax<HTMLDivElement>(0.35);

  return (
    <div className={s.page}>
      <HomeHeader />
      <section className={s.hero}>
        <div ref={heroMedia} className={s.heroMedia}>
          <HeroVideo />
        </div>
        <div className={s.noise} />
        <div className={s.fade} />
        <div className={s.heroContent}>
          <div className={s.heroTop}>
            <h1 className={`${s.h1} ${s.heroIn}`}>{t.heroTitle}</h1>
            <a href="#shop" className={`${s.cta} ${s.heroIn2}`}>
              {t.shopNow}
            </a>
          </div>
          <div className={s.heroBottom}>
            <span className={`${s.available} ${s.heroIn3}`}>{t.availableNow}</span>
            <span className={`${s.limited} ${s.heroIn4}`}>{t.limited}</span>
          </div>
        </div>
      </section>

      <section id="shop" className={s.shop}>
        <div className={s.grid} style={{ '--cols': gridCols(tiles.length) } as React.CSSProperties}>
          {tiles.map((p, i) => (
            <ProductTile key={p.id} p={p} index={i} />
          ))}
        </div>
        <div className={s.viewAllWrap}>
          <Link href="/shop" className={s.viewAll}>
            {t.viewAllHome}
          </Link>
        </div>
      </section>

      <Marquee text={t.marquee} />
      <Lookbook />

      {catTiles.length >= 2 && (
        <section className={s.cats}>
          <div className={s.catsHead}>
            <span className={s.catsH} data-reveal="mask">
              {t.categories}
            </span>
            <Link href="/shop" className={s.underlineLink}>
              {t.viewAllHome} →
            </Link>
          </div>
          <div className={s.catGrid}>
            {catTiles.map(([slug, span, ratio, size], i) => {
              const name = categoryLabel(slug);
              return (
                <Link
                  key={slug}
                  href={'/shop/' + slug}
                  className={`${s.cat} tic-zoom`}
                  data-reveal="img"
                  style={{ gridColumn: `span ${span}`, aspectRatio: ratio, '--reveal-delay': `${(i % 3) * 0.1}s` } as React.CSSProperties}
                >
                  <Photo src={SITE_IMAGES.categories[slug]} alt={name} className={s.img} sizes={span === 6 ? '100vw' : '(max-width: 700px) 100vw, 50vw'} />
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
      )}

      <section className={s.trust}>
        {t.trust.map((tr, i) => (
          <div key={tr.h} className={s.trustItem} data-reveal style={{ '--reveal-delay': `${i * 0.08}s` } as React.CSSProperties}>
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
      <CartDrawer />
    </div>
  );
}
