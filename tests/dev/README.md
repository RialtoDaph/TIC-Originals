# Local test stack

The app normally talks to Supabase and Stripe. For development and the automated tests this
folder provides a self-contained stand-in, so nothing needs a cloud account:

| Piece | Port | What it is |
|---|---|---|
| Postgres 16 | 54322 | Plain Postgres + `tests/db/supabase-bootstrap.sql` (roles, `auth.uid()`, `auth.users`) + the real migrations |
| PostgREST | 3001 | `postgrest/postgrest` Docker image — the same REST API Supabase uses |
| `gateway.mjs` | 54321 | Routes `/rest/v1` → PostgREST, mocks the Supabase Auth endpoints the app uses, mocks the Stripe endpoints, and `/__test/pay/:pi` simulates a payment and sends a correctly signed webhook |

Not for production. If you run the official Supabase CLI (`npx supabase start`) instead,
point `.env.local` at it — the migrations and seeds in `supabase/` work unchanged.

```bash
tests/dev/up.sh                                   # start Postgres, PostgREST and the gateway; reset the DB
psql -h /tmp -p 54322 -U postgres -d tic -f tests/fixtures/demo.sql   # optional demo data
cp tests/dev/env.local.example .env.local         # keys for the gateway
npm run dev

npm test                 # unit tests (Vitest)
tests/db/run.sh          # database tests (RLS, checkout finalisation)
npm run test:e2e         # end-to-end (Playwright); resets the DB + demo data first
```

Demo logins (fixture only): `owner@tic.test` / `owner-pass-123` (owner), `kunde@tic.test` / `kunde-pass-123`.
The sign-up OTP code in the mock is always `123456`.
