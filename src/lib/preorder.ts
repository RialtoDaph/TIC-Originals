import type { Lang, Product } from './types';

/** "2026-12-15" → "15.12.2026" (DE) / "15 Dec 2026" (EN). */
export function fmtShipDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  if (lang === 'de') return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Shipping date shown for a pre-order product; null when it ships normally. */
export function preorderDate(p: Pick<Product, 'preorder' | 'shipsFrom'> | undefined, lang: Lang): string | null {
  if (!p?.preorder) return null;
  return p.shipsFrom ? fmtShipDate(p.shipsFrom, lang) : lang === 'de' ? 'Termin folgt' : 'date to be announced';
}

/** Latest pre-order shipping date among products (the whole order ships together). */
export function latestShipDate(products: (Product | undefined)[], lang: Lang): string | null {
  const pre = products.filter((p): p is Product => !!p?.preorder);
  if (!pre.length) return null;
  const dated = pre.map((p) => p.shipsFrom).filter((d): d is string => !!d).sort();
  return dated.length === pre.length ? fmtShipDate(dated[dated.length - 1], lang) : preorderDate({ preorder: true, shipsFrom: null }, lang);
}
