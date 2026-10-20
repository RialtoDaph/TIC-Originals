import type { Metadata } from 'next';
import '@/styles/owner.css';
import { requireOwner } from '@/lib/auth';
import { loadOwnerData } from '@/lib/owner/load';
import { getLang } from '@/lib/lang';
import { OwnerApp } from '@/components/owner/OwnerApp';
import { OwnerLoadError } from '@/components/owner/OwnerLoadError';

// The owner dashboard is never indexed (also sent as an X-Robots-Tag header, see next.config.ts).
export const metadata: Metadata = {
  title: 'Owner',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

/**
 * Server-side owner guard: anyone without role = owner is redirected to "/". The dashboard code
 * lives only under this route segment, so it is code-split away from the storefront bundle.
 */
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireOwner({ onFail: 'redirect' });
  const lang = await getLang('tic-owner-lang', 'en');
  let data;
  try {
    data = await loadOwnerData(supabase);
  } catch (e) {
    console.error('owner data failed to load', e);
    return (
      <div className="owner-root">
        <OwnerLoadError lang={lang} />
      </div>
    );
  }
  return (
    <div className="owner-root">
      <OwnerApp data={data} initialLang={lang} />
      {children}
    </div>
  );
}
