import type { Metadata } from 'next';
import { ShopList } from '@/components/store/pages/ShopPage';
import { LockedShop } from '@/components/store/LockedShop';
import { createPublicClient } from '@/lib/supabase/public';
import { loadCurrentDrop } from '@/lib/catalog';
import { isShopLocked } from '@/lib/drops';

export const metadata: Metadata = { title: 'Shop All' };

export default async function Page() {
  const drop = await loadCurrentDrop(createPublicClient());
  return isShopLocked(drop) ? <LockedShop /> : <ShopList category="all" />;
}
