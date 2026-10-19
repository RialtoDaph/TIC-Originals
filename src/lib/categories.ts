// Storefront categories (navigation order from the design).
export const CATEGORIES: { slug: string; label: string }[] = [
  { slug: 'hoodies', label: 'Hoodies' },
  { slug: 'sweatsuits', label: 'Sweatsuits' },
  { slug: 't-shirts', label: 'T-Shirts' },
  { slug: 'pants', label: 'Pants' },
  { slug: 'shorts', label: 'Shorts' },
];

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
