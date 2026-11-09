import type { MetadataRoute } from 'next';
import { publicEnv } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/owner', '/api/', '/account', '/checkout', '/newsletter/'] }],
    sitemap: `${publicEnv.siteUrl()}/sitemap.xml`,
  };
}
