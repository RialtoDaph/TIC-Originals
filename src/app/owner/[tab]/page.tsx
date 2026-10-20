import { notFound } from 'next/navigation';
import { TABS, type Tab } from '@/lib/owner/types';

// The tab lives in the URL (/owner/:tab); OwnerApp in the layout renders it so dashboard
// state (search, open drawers) survives switching tabs.
export default async function Page({ params }: PageProps<'/owner/[tab]'>) {
  const { tab } = await params;
  if (!TABS.includes(tab as Tab)) notFound();
  return null;
}
