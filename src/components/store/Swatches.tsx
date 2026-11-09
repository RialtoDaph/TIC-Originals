'use client';

import Link from 'next/link';
import { colorHex } from '@/lib/models';
import type { Product } from '@/lib/types';
import s from './Swatches.module.css';

const inStock = (p: Product) => p.variants.some((v) => v.stock > 0);

/** Small colour dots under a product card (the card itself is the link). */
export function ColorDots({ colors, label, max = 5 }: { colors: Product[]; label: string; max?: number }) {
  if (colors.length < 2) return null;
  return (
    <span className={s.dots} aria-label={colors.map((c) => c.color).join(', ')}>
      {colors.slice(0, max).map((c) => {
        const hex = colorHex(c.color);
        return hex ? <span key={c.id} className={s.dot} style={{ background: hex }} title={c.color} /> : null;
      })}
      <span className={s.more}>{label}</span>
    </span>
  );
}

/** Colour picker on the product page: each colour is its own product page. */
export function ColorPicker({ current, colors, label, soldOut }: { current: Product; colors: Product[]; label: string; soldOut: string }) {
  if (colors.length < 2) return null;
  return (
    <div className={s.block}>
      <span className={s.label}>
        {label}: {current.color}
      </span>
      <div className={s.row}>
        {colors.map((c) => {
          const hex = colorHex(c.color);
          const active = c.id === current.id;
          const title = inStock(c) ? c.color : `${c.color} – ${soldOut}`;
          return hex ? (
            <Link key={c.id} href={'/shop/' + c.slug} scroll={false} replace aria-label={title} title={title} aria-current={active ? 'true' : undefined} className={`${s.swatch} ${active ? s.swatchActive : ''} ${inStock(c) ? '' : s.swatchSoldOut}`}>
              <span style={{ background: hex }} />
            </Link>
          ) : (
            <Link key={c.id} href={'/shop/' + c.slug} scroll={false} replace title={title} aria-current={active ? 'true' : undefined} className={`${s.chip} ${active ? s.chipActive : ''} ${inStock(c) ? '' : s.swatchSoldOut}`}>
              {c.color}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
