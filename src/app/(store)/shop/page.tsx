import type { Metadata } from 'next';
import { ShopList } from '@/components/store/pages/ShopPage';
import { LockedShop } from '@/components/store/LockedShop';
import { loadStorefront } from '@/lib/catalog';
import { isShopLocked } from '@/lib/drops';

export const metadata: Metadata = { title: 'Shop All', alternates: { canonical: '/shop' } };

export default async function Page() {
  const drop = (await loadStorefront()).drop;
  return isShopLocked(drop) ? <LockedShop /> : <ShopList category="all" />;
}
