import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { CUSTOMER, login, OWNER, sql } from './helpers';

test('signed-out visitors and customers are sent away from /owner (server-side)', async ({ page, request }) => {
  const anon = await request.get('/owner/today', { maxRedirects: 0 });
  expect(anon.status()).toBe(307);
  expect(anon.headers()['location']).toMatch(/^(http:\/\/localhost:3000)?\/$/);

  await login(page, CUSTOMER.email, CUSTOMER.password);
  await page.goto('/owner/orders');
  await expect(page).toHaveURL('http://localhost:3000/');
  const pdf = await page.request.get('/owner/invoice/00000000-0000-0000-0000-000000000000', { maxRedirects: 0 });
  expect(pdf.status()).toBe(403);
});

test.describe('as owner', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, OWNER.email, OWNER.password);
  });

  test('noindex, tabs in the URL, ⌘K palette and search', async ({ page }) => {
    const res = await page.goto('/owner');
    expect(res?.headers()['x-robots-tag']).toBe('noindex, nofollow');
    await expect(page).toHaveURL(/\/owner\/today$/);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
    await page.getByRole('navigation', { name: 'Dashboard' }).getByRole('button', { name: /^Products/ }).click();
    await expect(page).toHaveURL(/\/owner\/products$/);

    await page.keyboard.press('Control+k');
    await page.keyboard.type('insi');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/owner\/insights$/);
    await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();

    await page.getByLabel('Search orders, customers').fill('hannah');
    await expect(page).toHaveURL(/\/owner\/orders$/);
    await expect(page.getByText('Showing results for “hannah”')).toBeVisible();
    await expect(page.getByRole('button', { name: /Hannah Wolf/ })).toHaveCount(1);
  });

  test('ship all from Today, then undo', async ({ page }) => {
    await page.goto('/owner/today');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('4 orders to ship');
    await page.getByRole('button', { name: 'Create 4 DHL labels' }).click();
    await expect(page.getByRole('status')).toContainText('4 orders marked as shipped');
    await expect(page.getByText('Shipped 4 orders')).toBeVisible();
    expect(sql("select count(*) from orders where status = 'shipped' and shipped_at > now() - interval '1 minute'")[0]).toBe('4');
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('status')).toHaveText('Undone');
    expect(sql("select count(*) from orders where status = 'shipped' and shipped_at > now() - interval '1 minute'")[0]).toBe('0');
    await expect(page.getByRole('button', { name: 'Create 4 DHL labels' })).toBeVisible();
  });

  test('order drawer: refund a returned order', async ({ page }) => {
    await page.goto('/owner/orders');
    await page.getByRole('button', { name: /Refund 80,08 €/ }).first().waitFor();
    await page.getByText('Hannah Wolf').first().click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toContainText('Return received — refund within 14 days.');
    await drawer.getByRole('button', { name: 'Refund 80,08 €' }).click();
    await expect(page.getByRole('status')).toContainText('Refund of 80,08 € sent');
    expect(sql("select payment_status || '/' || refunded_cents from orders where last_name = 'Wolf' and status = 'returned'")[0]).toBe('refunded/8008');
  });

  test('products: add stock, hide a product from the shop, create a product', async ({ page }) => {
    await page.goto('/owner/products');
    const before = Number(sql("select stock from product_variants v join products p on p.id = v.product_id where p.slug = 'tic-logo-tee' and size = 'S'")[0]);
    await page.getByRole('button', { name: /^TIC Logo Tee S: \d+/ }).click();
    await expect(page.getByRole('status')).toContainText('Logo Tee · S: +10');
    expect(Number(sql("select stock from product_variants v join products p on p.id = v.product_id where p.slug = 'tic-logo-tee' and size = 'S'")[0])).toBe(before + 10);

    await page.getByRole('button', { name: 'TIC Sweatshorts: Visible' }).click();
    await expect(page.getByRole('status')).toContainText('Sweatshorts hidden from shop');
    const shop = await page.request.get('/shop');
    expect(await shop.text()).not.toContain('TIC Sweatshorts');

    await page.getByRole('button', { name: 'Add product' }).click();
    const modal = page.getByRole('dialog', { name: 'Add product' });
    await modal.getByLabel('Name').fill('TIC Longsleeve');
    await modal.getByLabel('Category').fill('T-Shirts');
    await modal.getByLabel('Price (€)').fill('49,89');
    await modal.getByRole('textbox').nth(5).fill('7'); // stock M
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Product added');
    expect(sql("select slug || '/' || category || '/' || price_cents from products where name = 'TIC Longsleeve'")[0]).toBe('tic-longsleeve/t-shirts/4989');
  });

  test('promo: create, toggle and delete a discount code', async ({ page }) => {
    await page.goto('/owner/promo');
    await page.getByRole('button', { name: 'New code' }).click();
    const modal = page.getByRole('dialog', { name: 'New discount code' });
    await modal.getByLabel('Code').fill('summer-20');
    await expect(modal.getByLabel('Code')).toHaveValue('SUMMER20');
    await modal.getByLabel('Discount (%)').fill('150');
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect(modal.getByRole('alert')).toHaveText('Value must be between 1 and 100');
    await modal.getByLabel('Discount (%)').fill('20');
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Code SUMMER20 created');
    await page.getByRole('button', { name: 'SUMMER20 on/off' }).click();
    await expect.poll(() => sql("select active from discount_codes where code = 'SUMMER20'")[0]).toBe('f');
    const row = page.locator('div', { has: page.getByText('SUMMER20', { exact: true }) }).last();
    await row.getByRole('button', { name: 'Delete' }).click();
    await row.getByRole('button', { name: 'Confirm delete' }).click();
    await expect.poll(() => sql("select count(*) from discount_codes where code = 'SUMMER20'")[0]).toBe('0');
  });

  test('settings: save is disabled until dirty; new free-shipping threshold reaches the shop', async ({ page }) => {
    await page.goto('/owner/settings');
    const save = page.getByRole('button', { name: 'Save changes' });
    await expect(save).toBeDisabled();
    await page.getByLabel('Free shipping from (€)').fill('100');
    await expect(page.getByText('Unsaved changes')).toBeVisible();
    await save.click();
    await expect(page.getByRole('status')).toHaveText('Settings saved');
    await expect(save).toBeDisabled();
    const shop = await page.request.get('/shop');
    expect(await shop.text()).toContain('Kostenloser Versand ab 100');
    sql('update site_settings set free_ship_cents = 8000');
  });

  test('dashboard switches to German', async ({ page }) => {
    await page.goto('/owner/orders');
    await page.getByRole('button', { name: 'Auf Deutsch umschalten' }).click();
    await expect(page.getByRole('heading', { name: 'Bestellungen' })).toBeVisible();
    await expect(page.getByText('Zahlung offen').first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Bestellungen' })).toBeVisible();
    await page.getByRole('button', { name: 'Switch to English' }).click();
  });

  test('invoice PDF and accounting CSV', async ({ page }) => {
    const id = sql("select id from orders where last_name = 'Becker' limit 1")[0];
    const pdf = await page.request.get(`/owner/invoice/${id}`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toBe('application/pdf');
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
    expect(sql(`select invoice_no from orders where id = '${id}'`)[0]).toMatch(/^RE-\d{4}-\d{4}$/);

    await page.goto('/owner/insights');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV for Steuerberater' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^tic-buchhaltung-\d{4}\.csv$/);
    const text = readFileSync((await download.path())!, 'utf8');
    expect(text).toContain('"Monat";"Bestellungen";"Brutto";"Erstattungen";"Versand";"Netto"');
    expect(text).toContain('Keine Umsatzsteuer gemäß § 19 UStG');
  });
});

test('customer account lists their orders', async ({ page }) => {
  await login(page, CUSTOMER.email, CUSTOMER.password);
  await expect(page.getByRole('heading', { name: 'Hey Lena' })).toBeVisible();
  await expect(page.getByText(/TIC-2026-D00164/)).toBeVisible();
  await page.getByRole('tab', { name: 'Meine Daten' }).click();
  await expect(page.getByText('kunde@tic.test')).toBeVisible();
});

test('registration with email OTP', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tic-consent', 'all'));
  await page.goto('/account');
  await page.getByRole('tab', { name: 'Registrieren' }).click();
  await page.fill('#acc-first', 'Neo');
  await page.fill('#acc-last', 'User');
  await page.fill('#acc-email', 'neo@test.de');
  await page.fill('#acc-pw', 'longpassword');
  await page.fill('#acc-pw2', 'longpassword');
  await page.getByRole('button', { name: 'Konto erstellen' }).click();
  await expect(page.getByText('Wir haben einen 6-stelligen Code an neo@test.de geschickt.')).toBeVisible();
  await page.fill('#acc-otp', '123456');
  await page.getByRole('button', { name: 'Bestätigen' }).click();
  await expect(page.getByRole('heading', { name: 'Hey Neo' })).toBeVisible();
  expect(sql("select first_name || ' ' || last_name || '/' || role from profiles p join auth.users u on u.id = p.id where u.email = 'neo@test.de'")[0]).toBe('Neo User/customer');
});
