import Link from 'next/link';
import '@/styles/store.css';

export default function NotFound() {
  return (
    <div className="store-root">
      <main style={{ minHeight: '100vh', padding: '120px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'clamp(64px,12vw,140px)', lineHeight: 0.9, textTransform: 'uppercase' }}>404</h1>
        <Link href="/shop" style={{ background: '#9EF2FF', color: '#111', padding: '16px 48px', fontStretch: '125%', fontSize: 12, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase' }}>
          Shop
        </Link>
      </main>
    </div>
  );
}
