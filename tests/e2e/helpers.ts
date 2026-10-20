import { execSync } from 'node:child_process';
import type { Page } from '@playwright/test';

export const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:54321';

/** Run SQL against the test database and return the first column of the rows. */
export function sql(query: string): string[] {
  const out = execSync(`psql -At -h \${PGHOST:-/tmp} -p \${PGPORT:-54322} -U postgres -d tic -c ${JSON.stringify(query)}`, { shell: '/bin/bash' }).toString().trim();
  return out ? out.split('\n') : [];
}

export async function login(page: Page, email: string, password: string) {
  await page.addInitScript(() => localStorage.setItem('tic-consent', 'all'));
  await page.goto('/account');
  await page.fill('#acc-email', email);
  await page.fill('#acc-pw', password);
  await page.click('button[type=submit]');
  await page.getByText(/^Hey /).waitFor();
}

export const OWNER = { email: 'owner@tic.test', password: 'owner-pass-123' };
export const CUSTOMER = { email: 'kunde@tic.test', password: 'kunde-pass-123' };
