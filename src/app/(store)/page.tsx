import { HomePage } from '@/components/store/pages/HomePage';
import { LockedShop } from '@/components/store/LockedShop';
import { createPublicClient } from '@/lib/supabase/public';
import { loadCurrentDrop } from '@/lib/catalog';
import { isShopLocked } from '@/lib/drops';

export default async function Page() {
  const drop = await loadCurrentDrop(createPublicClient());
  return isShopLocked(drop) ? <LockedShop /> : <HomePage />;
}
