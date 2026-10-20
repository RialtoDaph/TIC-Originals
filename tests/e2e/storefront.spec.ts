import { expect, test } from '@playwright/test';
import { GATEWAY, sql } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tic-consent', 'all'));
});

test('product page: size required, add to cart, cart drawer keeps tic-cart-v3', async ({ page }) => {
  await page.goto('/shop/tic-heavyweight-hoodie');
  await page.getByRole('button', { name: 'Größe wählen' }).click();
  await expect(page.getByText('Bitte wähle eine Größe.')).toBeVisible();
  await page.getByRole('radio', { name: 'M' }).click();
  await page.getByRole('button', { name: /In den Warenkorb · 69,89 €/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Warenkorb' });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('TIC Heavyweight Hoodie');
  await expect(drawer).toContainText('Noch 10,11 € bis zum kostenlosen Versand');
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('tic-cart-v3') || '[]'));
  expect(cart).toMatchObject([{ name: 'TIC Heavyweight Hoodie', size: 'M', qty: 1, eur: 69.89 }]);
  // Sold-out sizes can't be selected (seed: tracksuit XL = 0).
  await page.goto('/shop/till-i-collapse-piped-tracksuit');
  await expect(page.getByRole('radio', { name: 'XL' })).toBeDisabled();
});

test('language switch translates the storefront and persists', async ({ page }) => {
  await page.goto('/shop');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByRole('button', { name: /^Cart \(/ })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Free shipping over €80').first()).toBeVisible();
});

test('checkout validates fields and applies a discount code server-side', async ({ page }) => {
  const id = sql("select id from products where slug = 'tic-logo-tee'")[0];
  await page.addInitScript((pid) => localStorage.setItem('tic-cart-v3', JSON.stringify([{ id: pid, name: 'x', eur: 1, color: '', size: 'M', qty: 2 }])), id);
  await page.goto('/checkout');
  // The cart is re-priced from the database (eur: 1 above is ignored).
  await expect(page.getByText('69,78 €').first()).toBeVisible();
  await page.getByRole('button', { name: /Zahlungspflichtig bestellen/ }).click();
  await expect(page.getByText('Bitte prüfe die markierten Felder.')).toBeVisible();
  await page.fill('#f-zip', '123');
  await page.getByRole('button', { name: /Zahlungspflichtig bestellen/ }).click();
  await expect(page.getByText('Bitte gib eine gültige PLZ ein.')).toBeVisible();

  await page.getByLabel('Rabattcode').fill('nope');
  await page.getByRole('button', { name: 'Einlösen' }).click();
  await expect(page.getByText('Dieser Code ist ungültig.')).toBeVisible();
  await page.getByLabel('Rabattcode').fill('tic15');
  await page.getByRole('button', { name: 'Einlösen' }).click();
  await expect(page.getByText('Code TIC15 angewendet: 15 % Rabatt.')).toBeVisible();
  // 69,78 − 10,47 = 59,31 + 5,19 shipping = 64,50
  await expect(page.getByText('64,50 €').first()).toBeVisible();
  await page.getByRole('combobox').selectOption('AT');
  await expect(page.getByText('DHL International')).toBeVisible();
  await expect(page.getByText('73,50 €').first()).toBeVisible();
});

test('checkout API → Stripe webhook creates the order, takes stock, shows thanks', async ({ page, request }) => {
  const id = sql("select id from products where slug = 'tic-wide-sweatpants'")[0];
  const before = Number(sql(`select stock from product_variants where product_id = '${id}' and size = 'L'`)[0]);
  const body = { email: 'neu@kunde.de', first: 'Neu', last: 'Kunde', street: 'Weg 1', extra: '', zip: '85072', city: 'Eichstätt', country: 'DE', phone: '', lang: 'de', items: [{ id, size: 'L', qty: 2 }] };

  const wrong = await request.post('/api/checkout', { data: { ...body, expectedTotalCents: 1 } });
  expect(wrong.status()).toBe(409);
  expect((await wrong.json()).error).toBe('changed');

  const res = await request.post('/api/checkout', { data: { ...body, expectedTotalCents: 11978 } });
  expect(res.status()).toBe(200);
  const { clientSecret, orderNo } = await res.json();
  expect(orderNo).toMatch(/^TIC-\d{4}-[A-Z2-9]{6}$/);
  const pi = clientSecret.split('_secret_')[0];
  expect(sql(`select count(*) from orders where order_no = '${orderNo}'`)[0]).toBe('0'); // no order before payment

  const pay = await request.post(`${GATEWAY}/__test/pay/${pi}`, { data: { status: 'succeeded' } });
  expect((await pay.json()).webhook).toBe(200);
  expect(sql(`select status || '/' || payment_status || '/' || total_cents from orders where order_no = '${orderNo}'`)[0]).toBe('confirmed/paid/11978');
  expect(Number(sql(`select stock from product_variants where product_id = '${id}' and size = 'L'`)[0])).toBe(before - 2);
  // Webhook retries are idempotent.
  await request.post(`${GATEWAY}/__test/pay/${pi}`, { data: { status: 'succeeded' } });
  expect(sql(`select count(*) from orders where order_no = '${orderNo}'`)[0]).toBe('1');

  await page.goto(`/checkout/success?payment_intent=${pi}`);
  await expect(page.getByRole('heading', { name: 'Danke für deine Bestellung' })).toBeVisible();
  await expect(page.getByText(`Bestellung ${orderNo}`)).toBeVisible();
  await expect(page.getByText('neu@kunde.de')).toBeVisible();

  // Public tracking shows the order without personal data.
  await page.goto(`/policies/tracking?no=${orderNo}`);
  await expect(page.getByText(orderNo).first()).toBeVisible();
  await expect(page.getByText('Bestätigt').first()).toBeVisible();
});

test('SEPA: processing reserves stock as a pending order; failure cancels and releases it', async ({ request }) => {
  const id = sql("select id from products where slug = 'tic-logo-tee-sky'")[0];
  const stock = () => Number(sql(`select stock from product_variants where product_id = '${id}' and size = 'S'`)[0]);
  const before = stock();
  const res = await request.post('/api/checkout', {
    data: { email: 'sepa@kunde.de', first: 'Se', last: 'Pa', street: 'Weg 1', extra: '', zip: '85072', city: 'Eichstätt', country: 'DE', phone: '', lang: 'de', items: [{ id, size: 'S', qty: 1 }], expectedTotalCents: 3489 + 519 },
  });
  const { clientSecret, orderNo } = await res.json();
  const pi = clientSecret.split('_secret_')[0];
  await request.post(`${GATEWAY}/__test/pay/${pi}`, { data: { status: 'processing', method: 'pm_sepa_test' } });
  expect(sql(`select status || '/' || payment_status || '/' || payment_method from orders where order_no = '${orderNo}'`)[0]).toBe('pending/pending/SEPA');
  expect(stock()).toBe(before - 1);
  await request.post(`${GATEWAY}/__test/pay/${pi}`, { data: { status: 'failed', method: 'pm_sepa_test' } });
  expect(sql(`select status || '/' || payment_status from orders where order_no = '${orderNo}'`)[0]).toBe('cancelled/failed');
  expect(stock()).toBe(before);
});

test('checkout rejects stale stock and tampered prices', async ({ request }) => {
  const id = sql("select id from products where slug = 'till-i-collapse-piped-tracksuit'")[0];
  const res = await request.post('/api/checkout', {
    data: { email: 'a@b.de', first: 'A', last: 'B', street: 'W 1', extra: '', zip: '85072', city: 'X', country: 'DE', phone: '', lang: 'de', items: [{ id, size: 'XL', qty: 1 }], expectedTotalCents: 11989 },
  });
  expect(res.status()).toBe(409);
  expect((await res.json()).error).toBe('stock');
});

test('webhook rejects unsigned requests', async ({ request }) => {
  const res = await request.post('/api/stripe/webhook', { data: { type: 'payment_intent.succeeded' }, headers: { 'stripe-signature': 't=1,v1=bad' } });
  expect(res.status()).toBe(400);
});

test('contact form stores the message', async ({ page }) => {
  await page.goto('/policies/contact');
  await page.getByLabel('Name').fill('Max');
  await page.getByLabel('E-Mail', { exact: true }).fill('max@test.de');
  await page.getByLabel('Betreff').fill('Frage');
  await page.getByLabel('Nachricht').fill('Hallo!');
  await page.getByRole('button', { name: 'Nachricht senden' }).click();
  await expect(page.getByRole('button', { name: 'Gesendet ✓' })).toBeVisible();
  expect(sql("select message from contact_messages where email = 'max@test.de'")[0]).toBe('Hallo!');
});
