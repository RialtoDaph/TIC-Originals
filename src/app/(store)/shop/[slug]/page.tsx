import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetail, ShopList } from '@/components/store/pages/ShopPage';
import { LockedShop } from '@/components/store/LockedShop';
import { createPublicClient } from '@/lib/supabase/public';
import { loadCurrentDrop, mapProduct, PRODUCT_SELECT } from '@/lib/catalog';
import { CATEGORIES, categoryLabel } from '@/lib/categories';
import { isShopLocked } from '@/lib/drops';

async function loadProduct(slug: string) {
  const { data } = await createPublicClient().from('products').select(PRODUCT_SELECT).eq('slug', slug).maybeSingle();
  return data ? mapProduct(data) : null;
}

export async function generateMetadata({ params }: PageProps<'/shop/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  if (CATEGORIES.some((c) => c.slug === slug)) return { title: categoryLabel(slug) };
  const p = await loadProduct(slug);
  return { title: p?.name ?? 'Shop' };
}

/** /shop/<category> lists a category; any other slug is a product page. */
export default async function Page({ params }: PageProps<'/shop/[slug]'>) {
  const { slug } = await params;
  const drop = await loadCurrentDrop(createPublicClient());
  if (isShopLocked(drop)) return <LockedShop />;
  if (CATEGORIES.some((c) => c.slug === slug)) return <ShopList category={slug} />;
  const product = await loadProduct(slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
