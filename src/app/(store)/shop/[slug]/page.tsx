import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetail, ShopList } from '@/components/store/pages/ShopPage';
import { LockedShop } from '@/components/store/LockedShop';
import { loadStorefront } from '@/lib/catalog';
import { CATEGORIES, categoryLabel } from '@/lib/categories';
import { isShopLocked } from '@/lib/drops';
import { img } from '@/lib/images';
import { publicEnv } from '@/lib/env';
import type { Product } from '@/lib/types';

const loadProduct = async (slug: string) => (await loadStorefront()).products.find((p) => p.slug === slug) ?? null;

export async function generateMetadata({ params }: PageProps<'/shop/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  if (CATEGORIES.some((c) => c.slug === slug)) return { title: categoryLabel(slug), alternates: { canonical: '/shop/' + slug } };
  const p = await loadProduct(slug);
  if (!p) return { title: 'Shop' };
  const description = (p.descriptionDe || p.descriptionEn || `${p.name} – TIC Originals`).slice(0, 160);
  return {
    title: p.name,
    description,
    alternates: { canonical: '/shop/' + p.slug },
    openGraph: { type: 'website', title: p.name, description, images: p.images.slice(0, 1).map((src) => ({ url: img(src), alt: p.name })) },
  };
}

/** schema.org Product, so search results can show price and availability. */
function productJsonLd(p: Product) {
  const base = publicEnv.siteUrl();
  const abs = (src: string) => new URL(img(src), base).toString();
  const inStock = p.variants.some((v) => v.stock > 0);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.descriptionDe || p.descriptionEn || undefined,
    image: p.images.map(abs),
    sku: p.slug,
    color: p.color || undefined,
    material: p.materialDe || undefined,
    brand: { '@type': 'Brand', name: 'TIC Originals' },
    offers: {
      '@type': 'Offer',
      url: `${base}/shop/${p.slug}`,
      priceCurrency: 'EUR',
      price: (p.priceCents / 100).toFixed(2),
      availability: p.preorder ? 'https://schema.org/PreOrder' : inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      ...(p.preorder && p.shipsFrom ? { availabilityStarts: p.shipsFrom } : {}),
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

/** /shop/<category> lists a category; any other slug is a product page. */
export default async function Page({ params }: PageProps<'/shop/[slug]'>) {
  const { slug } = await params;
  const drop = (await loadStorefront()).drop;
  if (isShopLocked(drop)) return <LockedShop />;
  if (CATEGORIES.some((c) => c.slug === slug)) return <ShopList category={slug} />;
  const product = await loadProduct(slug);
  if (!product) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script element.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)).replace(/</g, '\\u003c') }}
      />
      <ProductDetail product={product} />
    </>
  );
}
