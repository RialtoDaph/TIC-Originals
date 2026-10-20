import { defineConfig } from '@playwright/test';

// End-to-end tests against the local stack (see tests/dev/README.md): Next.js on :3000,
// gateway (Supabase/Stripe mocks) on :54321, Postgres on :54322. Tests share one database,
// so they run serially; global setup resets it and loads tests/fixtures/demo.sql.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:3000',
    viewport: { width: 1440, height: 900 },
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
});
