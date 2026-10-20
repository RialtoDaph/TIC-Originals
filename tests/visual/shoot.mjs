// Screenshots of the app next to the design references (same viewport) for visual review.
// Usage: node tests/visual/shoot.mjs <outDir> [refDir]
import { chromium } from '@playwright/test';
import path from 'node:path';

const out = process.argv[2] || 'test-results/visual';
const refDir = process.argv[3];
const base = process.env.APP_URL || 'http://localhost:3000';
const pages = [
  ['home', '/', 'Home.dc.html'],
  ['shop', '/shop', 'Shop.dc.html#all'],
  ['pdp', '/shop/tic-heavyweight-hoodie', 'Shop.dc.html#p-p1'],
  ['checkout', '/checkout', 'Checkout.dc.html'],
  ['account', '/account', 'Account.dc.html'],
  ['policies', '/policies/shipping', 'Policies.dc.html#shipping'],
  ['faq', '/policies/faq', 'Policies.dc.html#faq'],
];
const only = process.env.ONLY?.split(',');
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [name, url, ref] of pages) {
  if (only && !only.includes(name)) continue;
  for (const [kind, target] of [['app', base + url], ...(refDir ? [['ref', (refDir.startsWith('http') ? refDir + '/' : 'file://' + path.resolve(refDir) + '/') + ref]] : [])]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    // The references load React/Babel from unpkg; serve them from a local node_modules if given.
    if (kind === 'ref' && process.env.UNPKG_DIR) {
      await page.route('https://unpkg.com/**', (route) => {
        const u = new URL(route.request().url());
        const m = u.pathname.match(/^\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.*)$/);
        return m ? route.fulfill({ path: path.join(process.env.UNPKG_DIR, m[1], m[2]), contentType: 'application/javascript' }) : route.abort();
      });
    }
    // Seed a cart for checkout screenshots (same item in both).
    let seedId = 'p1';
    if (kind === 'app' && name === 'checkout') {
      const r = await fetch(base.replace(':3000', ':54321') + '/rest/v1/products?select=id&slug=eq.tic-heavyweight-hoodie').catch(() => null);
      seedId = (r && r.ok ? (await r.json())[0]?.id : null) || seedId;
    }
    await page.addInitScript((id) => {
      try {
        localStorage.setItem('tic-consent', 'all');
        if (location.pathname.includes('heckout')) {
          localStorage.setItem('tic-cart-v3', JSON.stringify([{ id, name: 'TIC Heavyweight Hoodie', eur: 69.89, color: 'Schwarz', size: 'M', qty: 1 }]));
        }
      } catch {}
    }, seedId);
    await page.goto(target, { waitUntil: 'networkidle' }).catch(() => {});
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' }).catch(() => {});
    // Trigger lazy-loaded images before a full-page capture.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${name}-${kind}.png`, fullPage: process.env.FULL === '1' });
    await ctx.close();
  }
}
await browser.close();
console.log('done');
