import type { Product } from './types';

// Colour variants: products that share a model name are one design in different colours.
// Each colour stays its own product (own photos, stock, URL); the shop just groups them.

const key = (p: Product) => p.model.trim().toLowerCase() || 'id:' + p.id;

/** All colours of p's model in catalogue order (just [p] for a standalone product). */
export function colorsOf(p: Product, products: Product[]): Product[] {
  const k = key(p);
  const list = products.filter((x) => key(x) === k);
  return list.some((x) => x.id === p.id) ? list : [p, ...list];
}

/** One product per model, keeping the order of `list`; prefers a colour that is in stock. */
export function onePerModel(list: Product[]): Product[] {
  const groups = new Map<string, Product[]>();
  for (const p of list) groups.set(key(p), [...(groups.get(key(p)) ?? []), p]);
  return [...groups.values()].map((g) => g.find((p) => p.variants.some((v) => v.stock > 0)) ?? g[0]);
}

const HEX: Record<string, string> = {
  schwarz: '#111111',
  black: '#111111',
  weiß: '#FFFFFF',
  weiss: '#FFFFFF',
  white: '#FFFFFF',
  grau: '#8A8D91',
  grey: '#8A8D91',
  gray: '#8A8D91',
  anthrazit: '#3B3E42',
  beige: '#D8C8AE',
  creme: '#F1E9D8',
  cream: '#F1E9D8',
  braun: '#6B4A33',
  brown: '#6B4A33',
  blau: '#2F5DA8',
  blue: '#2F5DA8',
  navy: '#1F2A44',
  hellblau: '#9EC9F2',
  sky: '#9EC9F2',
  grün: '#3F7D4E',
  gruen: '#3F7D4E',
  green: '#3F7D4E',
  oliv: '#6B6B3A',
  olive: '#6B6B3A',
  rot: '#B3261E',
  red: '#B3261E',
  rosa: '#F2B8C6',
  pink: '#F2B8C6',
  lila: '#7A5BA6',
  purple: '#7A5BA6',
  gelb: '#F2C94C',
  yellow: '#F2C94C',
  orange: '#E8833A',
};

/** Swatch colour for a colour name like "Schwarz" or "Acid Wash Grau"; null when unknown (shown as text). */
export function colorHex(name: string): string | null {
  const words = name.toLowerCase().split(/[\s/-]+/);
  for (let i = words.length - 1; i >= 0; i--) if (HEX[words[i]]) return HEX[words[i]];
  return null;
}
