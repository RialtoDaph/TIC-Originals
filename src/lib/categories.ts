// Storefront categories. The client keeps the shop to two: Tops and Bottoms.
export const CATEGORIES: { slug: string; label: string }[] = [
  { slug: 'tops', label: 'Tops' },
  { slug: 'bottoms', label: 'Bottoms' },
];

/** Older, finer categories still stored on some products (or typed in the dashboard) → Tops / Bottoms. */
const LEGACY: Record<string, string> = {
  hoodies: 'tops',
  sweater: 'tops',
  sweaters: 'tops',
  crewneck: 'tops',
  crewnecks: 'tops',
  't-shirts': 'tops',
  tees: 'tops',
  shirts: 'tops',
  sweatsuits: 'tops',
  pants: 'bottoms',
  sweatpants: 'bottoms',
  shorts: 'bottoms',
  skirts: 'bottoms',
};

export function normalizeCategory(slug: string): string {
  return LEGACY[slug] ?? slug;
}

export function categoryLabel(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug.replace(/(^|-)([a-z])/g, (_, d, c) => (d ? ' ' : '') + c.toUpperCase());
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
