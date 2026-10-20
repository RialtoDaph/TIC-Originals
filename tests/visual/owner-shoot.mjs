// Logs in through /account and screenshots the owner dashboard tabs (and optionally the reference).
// Usage: node tests/visual/owner-shoot.mjs <outDir> [refBaseUrl]
import { chromium } from '@playwright/test';
import path from 'node:path';

const out = process.argv[2] || 'test-results/owner';
const ref = process.argv[3];
const base = process.env.APP_URL || 'http://localhost:3000';
const email = process.env.LOGIN_EMAIL || 'owner@tic.test';
const password = process.env.LOGIN_PASSWORD || 'owner-pass-123';
const tabs = (process.env.TABS || 'today,orders,products,insights,promo,settings').split(',');
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('tic-consent', 'all'));
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(base + '/account');
await page.fill('#acc-email', email);
await page.fill('#acc-pw', password);
await page.click('button[type=submit]');
await page.waitForSelector('text=/Hey /', { timeout: 15000 });
for (const tab of tabs) {
  await page.goto(`${base}/owner/${tab}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/owner-${tab}-app.png`, fullPage: process.env.FULL === '1' });
}
if (ref) {
  const rp = await ctx.newPage();
  if (process.env.UNPKG_DIR) {
    await rp.route('https://unpkg.com/**', (route) => {
      const m = new URL(route.request().url()).pathname.match(/^\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.*)$/);
      return m ? route.fulfill({ path: path.join(process.env.UNPKG_DIR, m[1], m[2]), contentType: 'application/javascript' }) : route.abort();
    });
  }
  await rp.goto(ref + '/Owner%20Dashboard.dc.html', { waitUntil: 'networkidle' });
  await rp.waitForTimeout(1500);
  await rp.screenshot({ path: `${out}/owner-today-ref.png`, fullPage: process.env.FULL === '1' });
  await rp.getByRole('button', { name: /^Orders/ }).first().click();
  await rp.waitForTimeout(500);
  await rp.screenshot({ path: `${out}/owner-orders-ref.png`, fullPage: process.env.FULL === '1' });
}
await browser.close();
console.log('done');
