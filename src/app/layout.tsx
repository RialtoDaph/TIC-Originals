import type { Metadata, Viewport } from 'next';
import '@/styles/fonts.css';
import '@/styles/tokens.css';
import { getLang } from '@/lib/lang';
import { publicEnv } from '@/lib/env';
import { SITE_IMAGES, img } from '@/lib/images';

const description = 'Till I Collapse Originals. Born in Germany. No shortcuts.';

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl()),
  title: { default: 'TIC Originals® | Official Site', template: '%s | TIC Originals' },
  description,
  icons: { icon: '/icon.png', apple: '/icon.png' },
  alternates: { canonical: '/' },
  // Link previews on Instagram, WhatsApp, TikTok etc.; product pages set their own photo.
  openGraph: {
    type: 'website',
    siteName: 'TIC Originals',
    title: 'TIC Originals® | Official Site',
    description,
    images: [{ url: img(SITE_IMAGES.lookbook.lead), width: 1200, height: 1800, alt: 'TIC Originals – Drop 002' }],
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}
