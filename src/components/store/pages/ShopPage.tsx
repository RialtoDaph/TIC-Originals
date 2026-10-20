'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../StoreProvider';
import { StoreHeader } from '../Headers';
import { ShopFooter } from '../Footers';
import { CartDrawer } from '../CartDrawer';
import { CATEGORIES, categoryLabel } from '@/lib/categories';
import { img } from '@/lib/images';
import type { Product } from '@/lib/types';
import s from './Shop.module.css';

function Card({ p, small = false }: { p: Product; small?: boolean }) {
  const { money } = useStore();
  const [hover, setHover] = useState(false);
  return (
    <Link href={'/shop/' + p.slug} className={s.card} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className={s.imgBox}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(p.images[0])} alt={p.name} className={s.img} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(p.images[1] ?? p.images[0])} alt="" className={s.img} style={{ opacity: hover ? 1 : 0 }} loading="lazy" />
      </div>
      <span className={small ? s.nameSm : s.name}>{p.name}</span>
      <span className={small ? s.priceSm : s.price}>{money(p.priceCents / 100)}</span>
    </Link>
  );
}

export function ShopList({ category }: { category: string }) {
  const { t, products } = useStore();
  const [sort, setSort] = useState('featured');
  let list = products.filter((p) => category === 'all' || p.category === category);
  if (sort === 'asc') list = [...list].sort((a, b) => a.priceCents - b.priceCents);
  if (sort === 'desc') list = [...list].sort((a, b) => b.priceCents - a.priceCents);
  const chips = [{ slug: 'all', label: t.all }, ...CATEGORIES];
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
            <div className={s.chips}>
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
          {list.map((p) => (
            <Card key={p.id} p={p} />
          ))}
        </div>
      </main>
      <ShopFooter />
      <CartDrawer />
    </div>
  );
}

export function ProductDetail({ product: p }: { product: Product }) {
  const { t, lang, products, money, amount, settings, addToCart, setCartOpen } = useStore();
  const [size, setSize] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [needSize, setNeedSize] = useState(false);
  const [added, setAdded] = useState(false);
  const [accOpen, setAccOpen] = useState<number | null>(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

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
  const related = [
    ...products.filter((x) => x.id !== p.id && x.category === p.category),
    ...products.filter((x) => x.id !== p.id && x.category !== p.category),
  ].slice(0, 4);
  const price = money(p.priceCents / 100);

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
              <div className={s.imgBox}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(imgs[imgIdx] ?? imgs[0])} alt={p.name} className={s.img} />
              </div>
              <div className={s.thumbs}>
                {imgs.map((src, i) => (
                  <button
                    key={src + i}
                    className={`${s.thumb} ${i === imgIdx ? s.thumbActive : ''}`}
                    onClick={() => setImgIdx(i)}
                    aria-label={`${p.name} ${i + 1}`}
                    aria-pressed={i === imgIdx}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img(src)} alt="" className={s.img} />
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
                  <span className={s.vat}>
                    {t.vat}{' '}
                    <Link href="/policies/shipping" className={s.ul}>
                      {t.shipCost}
                    </Link>
                  </span>
                </div>
              </div>
              <div className={s.sizeBlock}>
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
              <button
                className={`${s.addBtn} ${added ? s.addBtnAdded : ''}`}
                onClick={() => {
                  if (!size) return setNeedSize(true);
                  addToCart(p, size);
                  setAdded(true);
                  clearTimeout(timer.current);
                  timer.current = setTimeout(() => {
                    setAdded(false);
                    setCartOpen(true);
                  }, 700);
                }}
              >
                {added ? t.addedCheck : size ? t.add + ' · ' + price : t.choose}
              </button>
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
            {related.map((r) => (
              <Card key={r.id} p={r} small />
            ))}
          </div>
        </div>
      </main>
      <ShopFooter />
      <CartDrawer />
    </div>
  );
}
