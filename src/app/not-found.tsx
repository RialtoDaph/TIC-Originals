import Link from 'next/link';
import '@/styles/store.css';

// Rendered outside the store layout (no provider, no language state), so the copy is bilingual.
const btn = { padding: '16px 32px', fontStretch: '125%', fontSize: 12, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', minWidth: 160, boxSizing: 'border-box' } as const;

export default function NotFound() {
  return (
    <div className="store-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <header style={{ background: '#111', padding: '4px clamp(20px, 5vw, 70px)' }}>
        <Link href="/" aria-label="TIC Originals – Home" style={{ width: 120, height: 56, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tic-logo-blue.png" alt="TIC Originals" style={{ width: 160, height: 'auto', display: 'block' }} />
        </Link>
      </header>
      <main style={{ flex: 1, padding: '96px 20px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'clamp(88px,16vw,160px)', lineHeight: 0.85, textTransform: 'uppercase' }}>404</h1>
        <p style={{ margin: 0, maxWidth: 420, fontSize: 15, lineHeight: 1.6, color: '#555', textWrap: 'pretty' }}>
          Diese Seite gibt es nicht (mehr).
          <br />
          <span style={{ color: '#8a8a8a' }}>This page doesn’t exist (anymore).</span>
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
          <Link href="/shop" style={{ ...btn, background: '#9EF2FF', color: '#111' }}>
            Shop
          </Link>
          <Link href="/" style={{ ...btn, border: '1px solid #111', color: '#111' }}>
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
