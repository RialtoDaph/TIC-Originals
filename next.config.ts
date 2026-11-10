import type { NextConfig } from 'next';

// Remote photo hosts next/image may optimise: Supabase Storage (product uploads) and the optional CDN.
const remote = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_IMAGE_BASE_URL]
  .filter((u): u is string => !!u)
  .map((u) => new URL(u))
  .map((u) => ({ protocol: u.protocol.replace(':', '') as 'http' | 'https', hostname: u.hostname, port: u.port, pathname: '/**' }));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: remote,
    formats: ['image/avif', 'image/webp'],
  },
  devIndicators: false,
  agentRules: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // The owner dashboard must never be indexed (in addition to the robots meta tag).
        source: '/owner/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
