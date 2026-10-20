import { execSync } from 'node:child_process';

export default async function globalSetup() {
  execSync('tests/db/reset.sh', { stdio: 'inherit' });
  execSync('psql -v ON_ERROR_STOP=1 -q -h ${PGHOST:-/tmp} -p ${PGPORT:-54322} -U postgres -d tic -f tests/fixtures/demo.sql', { stdio: 'inherit', shell: '/bin/bash' });
  // The database was recreated: make PostgREST reload its schema cache, then wait until it serves.
  try {
    execSync('docker kill -s SIGUSR1 pgrst', { stdio: 'ignore' });
  } catch {}
  const url = (process.env.GATEWAY_URL || 'http://localhost:54321') + '/rest/v1/products?select=id&limit=1';
  for (let i = 0; i < 40; i++) {
    const ok = await fetch(url).then((r) => r.ok).catch(() => false);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('PostgREST did not come back after the database reset');
}
