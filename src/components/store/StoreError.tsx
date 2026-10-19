'use client';

import type { Lang } from '@/lib/types';
import { STORE } from '@/i18n/storefront';

/** Shown when the catalogue can't be loaded (not in the designs). */
export function StoreError({ lang }: { lang: Lang }) {
  const t = STORE[lang];
  return (
    <main style={{ minHeight: '100vh', padding: '120px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, textAlign: 'center' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'clamp(44px,8vw,88px)', lineHeight: 1, textTransform: 'uppercase' }}>
        TIC Originals
      </h1>
      <p role="alert" style={{ margin: 0, fontSize: 15, color: '#555' }}>
        {t.genericError}
      </p>
      <button
        onClick={() => location.reload()}
        style={{ background: '#9EF2FF', color: '#111', border: 0, padding: '16px 48px', fontStretch: '125%', fontSize: 12, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', cursor: 'pointer' }}
      >
        {t.retry}
      </button>
    </main>
  );
}
