'use client';

import { OWNER } from '@/i18n/owner';
import type { Lang } from '@/lib/types';

export function OwnerLoadError({ lang }: { lang: Lang }) {
  const t = OWNER[lang];
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <span role="alert" style={{ fontSize: 15, color: '#ECEEF1' }}>
        {t.error}
      </span>
      <button onClick={() => location.reload()} style={{ height: 38, padding: '0 18px', border: 0, borderRadius: 10, background: '#7C9CFF', color: '#0E1220', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        {t.retry}
      </button>
    </div>
  );
}
