'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from './StoreProvider';
import { subscribeNewsletter } from '@/app/(store)/actions';

function countdown(target: number, now: number) {
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 864e5);
  const h = Math.floor((diff % 864e5) / 36e5);
  const m = Math.floor((diff % 36e5) / 6e4);
  const sec = Math.floor((diff % 6e4) / 1e3);
  return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
}

/**
 * Shown instead of Home/Shop/Checkout while Promo → "Lock shop until drop" is on.
 * Not part of the storefront designs: kept deliberately minimal in the storefront style.
 */
export function LockedShop() {
  const { t, drop, lang } = useStore();
  const target = drop ? new Date(drop.liveAt).getTime() : 0;
  const [now, setNow] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the client clock after hydration
    setNow(Date.now());
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= target) location.reload();
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <main style={{ minHeight: '100vh', background: '#111', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ height: 110, width: 200, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tic-logo.png" alt="Till I Collapse" style={{ height: 260, width: 260, filter: 'invert(1)' }} />
      </div>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'clamp(56px,10vw,112px)', lineHeight: 0.88, textTransform: 'uppercase' }}>
        {t.lockedH(drop?.name ?? '')}
      </h1>
      <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 'clamp(22px,4vw,34px)', letterSpacing: '.12em', color: '#9EF2FF' }} aria-live="off">
        {now === null ? ' ' : countdown(target, now)}
      </span>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setState('busy');
          const r = await subscribeNewsletter(email, 'drop', lang).catch(() => ({ ok: false }));
          setState(r.ok ? 'done' : 'error');
        }}
        style={{ width: 'min(100%, 520px)', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <span style={{ fontSize: 12, letterSpacing: '.35em', textTransform: 'uppercase', color: '#8A8A8A' }}>{t.lockedNotify}</span>
        <div style={{ height: 76, border: '1px solid #3A3A3A', borderRadius: 38, display: 'flex', alignItems: 'center', padding: '0 8px 0 32px', gap: 12 }}>
          <input type="email" required placeholder="E-MAIL" aria-label={t.email} value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 'none', color: '#fff', fontSize: 14, letterSpacing: '.2em' }} />
          <button disabled={state === 'busy'} aria-label={t.send} style={{ width: 60, height: 60, borderRadius: '50%', border: 0, background: '#fff', color: '#111', fontSize: 19, cursor: 'pointer', flexShrink: 0 }}>
            →
          </button>
        </div>
        <span role="status" style={{ fontSize: 13, color: '#9EF2FF', minHeight: 18 }}>
          {state === 'done' ? t.lockedDone : state === 'error' ? t.badEmail : ''}
        </span>
      </form>
      <Link href="/policies/faq" style={{ fontSize: 12, color: '#8A8A8A', textDecoration: 'underline', textUnderlineOffset: 3 }}>
        FAQ
      </Link>
    </main>
  );
}
