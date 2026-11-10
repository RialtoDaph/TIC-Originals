import { HomePage } from '@/components/store/pages/HomePage';
import { LockedShop } from '@/components/store/LockedShop';
import { loadStorefront } from '@/lib/catalog';
import { isShopLocked } from '@/lib/drops';

export default async function Page() {
  const drop = (await loadStorefront()).drop;
  return isShopLocked(drop) ? <LockedShop /> : <HomePage />;
}
