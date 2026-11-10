'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../StoreProvider';
import { StoreHeader } from '../Headers';
import { ShopFooter } from '../Footers';
import { CartDrawer } from '../CartDrawer';
import { categoryLabel } from '@/lib/categories';
import { colorsOf, onePerModel } from '@/lib/models';
import { preorderDate } from '@/lib/preorder';
import { ColorDots, ColorPicker } from '../Swatches';
import type { Product } from '@/lib/types';
import { Photo } from '../Photo';
import s from './Shop.module.css';

const CARD_SIZES = '(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw';

function Card({ p, small = false, index = 0 }: { p: Product; small?: boolean; index?: number }) {
  const { price, products, t } = useStore();
  const colors = colorsOf(p, products);
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={'/shop/' + p.slug}
      className={s.card}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-reveal="quick"
      style={{ '--reveal-delay': `${(index % 3) * 0.05}s` } as React.CSSProperties}
    >
      <div className={`${s.imgBox} tic-zoom`}>
        <Photo src={p.images[0]} alt={p.name} className={s.img} sizes={CARD_SIZES} />
        <Photo src={p.images[1] ?? p.images[0]} alt="" className={s.img} style={{ opacity: hover ? 1 : 0 }} sizes={CARD_SIZES} />
      </div>
      <span className={small ? s.nameSm : s.name}>{colors.length > 1 && p.model.trim() ? p.model : p.name}</span>
      <span className={small ? s.priceSm : s.price}>
        {price(p.priceCents / 100)}
        {p.preorder && <span className={s.preTag}>{t.preorder}</span>}
      </span>
      <ColorDots colors={colors} label={t.colorsN(colors.length)} />
    </Link>
  );
}

export function ShopList({ category }: { category: string }) {
  const { t, products, categories } = useStore();
  const [sort, setSort] = useState('featured');
  let list = products.filter((p) => category === 'all' || p.category === category);
  if (sort === 'asc') list = [...list].sort((a, b) => a.priceCents - b.priceCents);
  if (sort === 'desc') list = [...list].sort((a, b) => b.priceCents - a.priceCents);
  list = onePerModel(list);
  const chips = [{ slug: 'all', label: t.all }, ...categories];
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // On phones the chips scroll sideways: bring the current category into view.
    const row = chipsRef.current;
    const el = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (row && el && row.scrollWidth > row.clientWidth) row.scrollLeft = el.offsetLeft - row.offsetLeft - 20;
  }, [category]);
  return (
    <div className={s.page}>
      <StoreHeader variant="shop" active={category} />
      <main className={s.main}>
        <div className={s.top}>
          <div className={s.titleRow}>
            <h1 className={s.h1}>{category === 'all' ? 'Shop All' : categoryLabel(category)}</h1>
            <span className={s.count}>{t.items(list.length)}</span>
          </div>
          <div className={s.filterRow}>
            <div className={s.chips} ref={chipsRef}>
              {chips.map((c) => (
                <Link
                  key={c.slug}
                  href={c.slug === 'all' ? '/shop' : '/shop/' + c.slug}
                  className={`${s.chip} ${c.slug === category ? s.chipActive : ''}`}
                  aria-current={c.slug === category ? 'page' : undefined}
                >
                  {c.label}
                </Link>
              ))}
            </div>
            <label className={s.sortLabel}>
              {t.sortBy}
              <select className={s.select} value={sort} onChange={(e) => setSort(e.target.value)}>
                {t.sorts.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className={s.grid}>
          {list.map((p, i) => (
            <Card key={p.id} p={p} index={i} />
          ))}
        </div>
      </main>
      <ShopFooter />
      <CartDrawer />
    </div>
  );
}

/** "Komplettes Set": the other pieces of p's set, each with sizes that add straight to the cart. */
function SetPieces({ p }: { p: Product }) {
  const { t, lang, products, price, addToCart, setCartOpen } = useStore();
  const [done, setDone] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const key = p.setName.trim().toLowerCase();
  const pieces = key ? products.filter((x) => x.id !== p.id && x.setName.trim().toLowerCase() === key) : [];
  if (!pieces.length) return null;
  return (
    <div className={s.setBlock}>
      <span className={s.sizeLabel}>{t.completeSet}</span>
      <span className={s.setHint}>{t.setHint}</span>
      {pieces.map((x) => {
        const ships = preorderDate(x, lang);
        return (
          <div key={x.id} className={s.setRow}>
            <Link href={'/shop/' + x.slug} className={s.setImg}>
              <Photo src={x.images[0]} alt={x.name} className={s.img} sizes="120px" />
            </Link>
            <div className={s.setInfo}>
              <Link href={'/shop/' + x.slug} className={s.setName}>
                {x.name}
              </Link>
              <span className={s.setPrice}>
                {price(x.priceCents / 100)}
                {ships ? ' · ' + t.preorder : ''}
              </span>
              <div className={s.setSizes}>
                {x.variants.map((v) => (
                  <button
                    key={v.size}
                    className={`${s.setSize} ${done === x.id + v.size ? s.sizeBtnActive : ''}`}
                    disabled={v.stock <= 0}
                    title={v.stock <= 0 ? t.soldOut : undefined}
                    aria-label={`${x.name} ${v.size}`}
                    onClick={() => {
                      addToCart(x, v.size);
                      setDone(x.id + v.size);
                      clearTimeout(timer.current);
                      timer.current = setTimeout(() => {
                        setDone(null);
                        setCartOpen(true);
                      }, 600);
                    }}
                  >
                    {done === x.id + v.size ? '✓' : v.size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProductDetail({ product: p }: { product: Product }) {
  const { t, lang, products, price: display, amount, settings, addToCart, setCartOpen } = useStore();
  const [size, setSize] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [needSize, setNeedSize] = useState(false);
  const [added, setAdded] = useState(false);
  const [accOpen, setAccOpen] = useState<number | null>(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const track = useRef<HTMLDivElement>(null);
  const sizeBlock = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  // Phones: a bar with price + add button is shown whenever the real button is off screen.
  const [barOn, setBarOn] = useState(false);
  useEffect(() => {
    const el = addRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setBarOn(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Thumbnail → slide. On phones the gallery is a swipeable strip, so it scrolls there too. */
  const showImage = (i: number) => {
    setImgIdx(i);
    const t = track.current;
    if (t && t.scrollWidth > t.clientWidth + 1) t.scrollTo({ left: i * t.clientWidth, behavior: 'smooth' });
  };

  const add = (fromBar = false) => {
    if (!size) {
      setNeedSize(true);
      if (fromBar) sizeBlock.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    addToCart(p, size);
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setAdded(false);
      setCartOpen(true);
    }, 700);
  };

  const imgs = p.images.length ? p.images : [''];
  const catLabel = categoryLabel(p.category);
  const material = lang === 'de' ? p.materialDe : p.materialEn;
  const details = [lang === 'de' ? p.descriptionDe : p.descriptionEn, material && `${t.material}: ${material}${p.weightG ? ' · ' + p.weightG + ' g' : ''}`]
    .filter(Boolean)
    .join(' ');
  const care = lang === 'de' ? p.careDe : p.careEn;
  const acc = (
    [
      [t.accH[0], details],
      [t.accH[1], care],
      [t.accH[2], t.shipText(amount(settings.shipDeCents), amount(settings.freeShipCents))],
    ] as [string, string | null][]
  ).filter((x): x is [string, string] => !!x[1]);
  const colors = colorsOf(p, products);
  const others = products.filter((x) => !colors.some((c) => c.id === x.id));
  const related = onePerModel([...others.filter((x) => x.category === p.category), ...others.filter((x) => x.category !== p.category)]).slice(0, 4);
  const price = display(p.priceCents / 100);
  const ships = preorderDate(p, lang);
  const addLabel = ships ? t.preorderBtn : t.add;

  return (
    <div className={s.page}>
      <StoreHeader variant="shop" active={p.category} />
      <main className={s.pdpMain}>
        <div className={s.pdpTop}>
          <nav className={s.crumbs} aria-label="Breadcrumb">
            <Link href="/shop">Shop</Link>
            <span>/</span>
            <Link href={'/shop/' + p.category}>{catLabel}</Link>
            <span>/</span>
            <span className={s.crumbCurrent}>{p.name}</span>
          </nav>
          <div className={s.pdpGrid}>
            <div className={s.gallery}>
              <div
                ref={track}
                className={`${s.imgBox} ${s.slides}`}
                onScroll={(e) => {
                  const t = e.currentTarget;
                  const i = Math.round(t.scrollLeft / t.clientWidth);
                  if (i !== imgIdx && i >= 0 && i < imgs.length) setImgIdx(i);
                }}
              >
                {imgs.map((src, i) => (
                  <div key={src + i} className={s.slide} data-active={i === imgIdx} aria-hidden={i !== imgIdx}>
                    <Photo src={src} alt={i === 0 ? p.name : ''} className={s.img} sizes="(max-width: 900px) 100vw, 50vw" preload={i === 0} />
                  </div>
                ))}
              </div>
              {imgs.length > 1 && (
                <div className={s.dots} aria-hidden="true">
                  {imgs.map((src, i) => (
                    <span key={src + i} className={s.dot} data-active={i === imgIdx} />
                  ))}
                </div>
              )}
              <div className={s.thumbs}>
                {imgs.map((src, i) => (
                  <button
                    key={src + i}
                    className={`${s.thumb} ${i === imgIdx ? s.thumbActive : ''}`}
                    onClick={() => showImage(i)}
                    aria-label={`${p.name} ${i + 1}`}
                    aria-pressed={i === imgIdx}
                  >
                    <Photo src={src} alt="" className={s.img} sizes="160px" />
                  </button>
                ))}
              </div>
            </div>
            <div className={s.buy}>
              <div className={s.head}>
                <span className={s.eyebrow}>{catLabel}</span>
                <h1 className={s.pdpH1}>{p.name}</h1>
                <div className={s.priceBlock}>
                  <span className={s.pdpPrice}>{price}</span>
                  {ships && <span className={s.preorderBadge}>{t.preorderShips(ships)}</span>}
                  <span className={s.vat}>
                    {t.vat}{' '}
                    <Link href="/policies/shipping" className={s.ul}>
                      {t.shipCost}
                    </Link>
                  </span>
                </div>
              </div>
              <ColorPicker current={p} colors={colors} label={t.color} soldOut={t.soldOut} />
              <div className={s.sizeBlock} ref={sizeBlock}>
                <div className={s.sizeHead}>
                  <span className={s.sizeLabel}>
                    {t.size}
                    {size ? ': ' + size : ''}
                  </span>
                  <Link href="/policies/faq" className={s.guide}>
                    {t.sizeGuide}
                  </Link>
                </div>
                <div className={s.sizes} role="radiogroup" aria-label={t.size}>
                  {p.variants.map((v) => (
                    <button
                      key={v.size}
                      role="radio"
                      aria-checked={v.size === size}
                      disabled={v.stock <= 0}
                      title={v.stock <= 0 ? t.soldOut : undefined}
                      className={`${s.sizeBtn} ${v.size === size ? s.sizeBtnActive : ''}`}
                      onClick={() => {
                        setSize(v.size);
                        setNeedSize(false);
                      }}
                    >
                      {v.size}
                    </button>
                  ))}
                </div>
                {needSize && (
                  <span className={s.err} role="alert">
                    {t.pickSize}
                  </span>
                )}
              </div>
              <button ref={addRef} className={`${s.addBtn} ${added ? s.addBtnAdded : ''}`} onClick={() => add()}>
                {added ? t.addedCheck : size ? addLabel + ' · ' + price : t.choose}
              </button>
              <SetPieces p={p} />
              <div className={s.perks}>
                {t.perks(amount(settings.freeShipCents)).map((pk) => (
                  <span key={pk} className={s.perk}>
                    <span className={s.perkDot} />
                    {pk}
                  </span>
                ))}
              </div>
              <div className={s.acc}>
                {acc.map(([h, txt], i) => (
                  <div key={h} className={s.accItem}>
                    <button className={s.accBtn} onClick={() => setAccOpen(accOpen === i ? null : i)} aria-expanded={accOpen === i}>
                      <span>{h}</span>
                      <span className={s.accSign}>{accOpen === i ? '−' : '+'}</span>
                    </button>
                    {accOpen === i && <p className={s.accP}>{txt}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={s.related}>
          <div className={s.relatedHead}>
            <span className={s.relatedH}>{t.related}</span>
            <Link href="/shop" className={s.underlineLink}>
              {t.viewAll} →
            </Link>
          </div>
          <div className={s.relatedGrid}>
            {related.map((r, i) => (
              <Card key={r.id} p={r} small index={i} />
            ))}
          </div>
        </div>
      </main>
      <ShopFooter />
      <div className={s.buyBar} data-on={barOn} aria-hidden={!barOn}>
        <div className={s.buyBarInfo}>
          <span className={s.buyBarName}>{p.name}</span>
          <span className={s.buyBarPrice}>
            {price}
            {size ? ' · ' + size : ''}
          </span>
        </div>
        <button className={`${s.buyBarBtn} ${added ? s.addBtnAdded : ''}`} onClick={() => add(true)} tabIndex={barOn ? 0 : -1}>
          {added ? t.addedCheck : size ? addLabel : t.choose}
        </button>
      </div>
      <CartDrawer />
    </div>
  );
}
