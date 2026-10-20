import type { Metadata, Viewport } from 'next';
import '@/styles/fonts.css';
import '@/styles/tokens.css';
import { getLang } from '@/lib/lang';

export const metadata: Metadata = {
  title: { default: 'TIC Originals® | Official Site', template: '%s | TIC Originals' },
  description: 'Till I Collapse Originals. Born in Germany. No shortcuts.',
  icons: { icon: '/tic-logo.png' },
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
