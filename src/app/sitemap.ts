import type { MetadataRoute } from 'next';
import { publicEnv } from '@/lib/env';
import { POLICY_KEYS } from '@/i18n/policies';
import { createPublicClient } from '@/lib/supabase/public';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'daily', priority: 0.9 },
    ...POLICY_KEYS.filter((k) => k !== 'tracking').map((k) => ({ url: `${base}/policies/${k}`, changeFrequency: 'yearly' as const, priority: 0.3 })),
  ];
  try {
    const { data } = await createPublicClient().from('products').select('slug, updated_at').eq('visible', true);
    for (const p of data ?? []) entries.push({ url: `${base}/shop/${p.slug}`, lastModified: p.updated_at, changeFrequency: 'weekly', priority: 0.8 });
  } catch {
    // The sitemap still lists the static pages if the database is unreachable.
  }
  return entries;
}
