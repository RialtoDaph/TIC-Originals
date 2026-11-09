import { describe, expect, it } from 'vitest';
import { colorHex, colorsOf, onePerModel } from '@/lib/models';
import type { Product } from '@/lib/types';

const product = (id: string, model: string, color: string, stock = 5): Product => ({
  id,
  slug: id,
  name: `${model || id} — ${color}`,
  category: 't-shirts',
  priceCents: 1489,
  model,
  preorder: false,
  shipsFrom: null,
  setName: '',
  color,
  materialDe: '',
  materialEn: '',
  weightG: null,
  descriptionDe: null,
  descriptionEn: null,
  careDe: null,
  careEn: null,
  images: [],
  visible: true,
  lowStock: 3,
  sortOrder: 0,
  variants: [{ id: id + '-m', size: 'M', stock }],
});

const black = product('choppa-schwarz', 'Choppa Tee', 'Schwarz', 0);
const white = product('choppa-weiss', 'choppa tee ', 'Weiß');
const grey = product('mirrors-grau', 'Mirrors Tee', 'Grau');
const solo = product('boxer', '', '3er-Pack');
const all = [black, white, grey, solo];

describe('colour variants', () => {
  it('groups colours by model name, ignoring case and spaces', () => {
    expect(colorsOf(black, all).map((p) => p.id)).toEqual(['choppa-schwarz', 'choppa-weiss']);
  });

  it('treats products without a model as standalone', () => {
    expect(colorsOf(solo, all)).toEqual([solo]);
    expect(colorsOf(product('x', '', 'Rot'), all).map((p) => p.id)).toEqual(['x']);
  });

  it('shows one card per model and prefers a colour in stock', () => {
    expect(onePerModel(all).map((p) => p.id)).toEqual(['choppa-weiss', 'mirrors-grau', 'boxer']);
  });

  it('maps colour names to swatches', () => {
    expect(colorHex('Schwarz')).toBe('#111111');
    expect(colorHex('Acid Wash Grau')).toBe('#8A8D91');
    expect(colorHex('3er-Pack')).toBeNull();
  });
});

describe('pre-order dates', async () => {
  const { fmtShipDate, latestShipDate, preorderDate } = await import('@/lib/preorder');
  const pre = (shipsFrom: string | null) => ({ ...product('p' + shipsFrom, '', 'Grau'), preorder: true, shipsFrom });

  it('formats the shipping date per language', () => {
    expect(fmtShipDate('2026-12-15', 'de')).toBe('15.12.2026');
    expect(fmtShipDate('2026-12-15', 'en')).toBe('15 Dec 2026');
  });

  it('only labels pre-order products', () => {
    expect(preorderDate(product('x', '', 'Grau'), 'de')).toBeNull();
    expect(preorderDate(pre('2026-12-15'), 'de')).toBe('15.12.2026');
    expect(preorderDate(pre(null), 'de')).toBe('Termin folgt');
  });

  it('uses the latest date, since the whole order ships together', () => {
    expect(latestShipDate([pre('2026-12-15'), pre('2027-01-10'), product('y', '', 'Weiß')], 'de')).toBe('10.01.2027');
    expect(latestShipDate([product('y', '', 'Weiß')], 'de')).toBeNull();
  });
});
