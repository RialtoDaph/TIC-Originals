# TIC Originals

Storefront and Owner Dashboard for TIC Originals (Till I Collapse), built from the design handoff
(`design_handoff_tic_store`).

- **Stack:** Next.js 16 (App Router, TypeScript) · Supabase (Postgres, Auth, RLS) · Stripe Payment Element · Vercel
- **Storefront** (light, Anton/Archivo, cyan `#9EF2FF`): `/`, `/shop`, `/shop/:category`, `/shop/:product`, `/checkout`, `/checkout/success`, `/account`, `/policies/:page`
- **Owner Dashboard** (dark, DM Sans/DM Mono, `#7C9CFF`): `/owner/:tab` — `today`, `orders`, `products`, `insights`, `promo`, `settings`

## How it fits together

| Concern | Where |
|---|---|
| Design tokens (fonts, status colours) | `src/styles/tokens.css`, `src/lib/tokens.ts` — self-hosted fonts in `public/fonts` (`src/styles/fonts.css`) |
| Copy (DE/EN) | `src/i18n/storefront.ts`, `src/i18n/policies.ts`, `src/i18n/owner.ts`, `src/i18n/emails.ts` |
| Cart | `localStorage` key `tic-cart-v3` (`src/components/store/StoreProvider.tsx`), re-priced from the live catalogue |
| Auth | Supabase Auth (email + password with 6-digit email code, Google). Sessions in cookies, refreshed in `src/proxy.ts` |
| Owner guard | Server-side in `src/app/owner/layout.tsx` (`requireOwner`), again in every owner server action / route, and in the database (`public.is_owner()` RLS policies). Signed-out visitors are already turned away in `src/proxy.ts`. The dashboard code lives only under `/owner`, so it is split out of the storefront bundle. `/owner` sends `noindex` (meta + `X-Robots-Tag`). |
| Checkout | `src/components/store/pages/CheckoutPage.tsx` + `src/app/api/checkout/route.ts`. The cart is priced on the server (prices, stock, discount rules, shipping). "Zahlungspflichtig bestellen" is the final click and confirms the Payment Element. |
| Orders | Created only by the Stripe webhook (`src/app/api/stripe/webhook/route.ts` → SQL `finalize_checkout`), atomically with stock and code usage. SEPA: an order appears as *Awaiting payment* with stock reserved while the debit is processing; a failed debit cancels it and releases the stock. |
| Dashboard data | `src/lib/owner/load.ts` (reads), `src/lib/owner/derive.ts` (pure calculations: tasks, insights, restock, Kleinunternehmer, Buchhaltung), `src/app/owner/actions.ts` (mutations) |
| Images | `src/lib/images.ts` — paths are configurable; see *Images* below |

## Setup

### 1. Supabase

1. Create a project (region EU, e.g. Frankfurt).
2. Apply the database: `npx supabase link --project-ref <ref>` then `npx supabase db push`, or paste the files in
   `supabase/migrations/` (in order) into the SQL editor.
3. Load `supabase/seed.sql` (settings, the `TIC15` popup code, the next drop) and — optionally — `supabase/seed.products.sql`
   (the 8 products from the design with placeholder images; editable in the dashboard, delete the file once the real catalogue is in).
4. **Authentication → URL configuration:** Site URL = your domain; add `https://<domain>/**` (and `http://localhost:3000/**`) to redirect URLs.
5. **Authentication → Providers → Email:** keep "Confirm email" on. In **Email templates → Confirm signup** include the
   code: `{{ .Token }}` (the account page asks for the 6-digit code). Set up custom SMTP for production sending.
6. **Authentication → Providers → Google:** add the OAuth client ID/secret (Google Cloud console, redirect URI from Supabase).
7. **Make yourself owner:** sign up on `/account`, then run in the SQL editor:
   `update public.profiles set role = 'owner' where id = (select id from auth.users where email = 'you@…');`

### 2. Stripe

1. API keys → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`.
2. **Settings → Payment methods:** turn on Cards, PayPal, Klarna, SEPA Direct Debit, Apple Pay / Google Pay.
   The checkout uses automatic payment methods, so changes there need no code changes.
3. **Developers → Webhooks:** endpoint `https://<domain>/api/stripe/webhook` with the events
   `payment_intent.processing`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
   → signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Apple Pay:** register your domain under Settings → Payment method domains.

### 3. Vercel

Import the repo, set the environment variables from `.env.example` (Production and Preview), deploy.

### 4. Optional integrations

- **Email (Resend):** `RESEND_API_KEY`, `EMAIL_FROM` (verified domain). Sends the order confirmation (contract conclusion),
  shipping and refund emails, invoices, cart/payment reminders and VIP codes. Without a key emails are only logged and
  the dashboard toasts say nothing was sent.
- **Telegram:** `TELEGRAM_BOT_TOKEN`; the chat ID is entered in Settings → Notifications.

### Images

Placeholders live in `public/img`. To use real photography either replace those files, change the paths on the
products (`products.images`) / in `SITE_IMAGES` (`src/lib/images.ts`), or set `NEXT_PUBLIC_IMAGE_BASE_URL` to a CDN or
Supabase Storage bucket that mirrors the same paths.

## Development

```bash
npm install
cp .env.example .env.local   # fill in, or use the local test stack (tests/dev/README.md)
npm run dev
```

Checks: `npm run typecheck`, `npm run lint`, `npm test` (unit), `tests/db/run.sh` (RLS + checkout SQL),
`npm run test:e2e` (Playwright, needs the local stack). The local stack (`tests/dev`) runs Postgres + PostgREST plus a
small Supabase-Auth/Stripe mock, so the full flow — sign-up with code, owner guard, checkout → webhook → order,
dashboard actions — is tested without cloud accounts.

## Open items / TODO in code

- **DHL labels** (`TODO(dhl)`): "Create DHL label" marks orders as shipped and emails the customer; labels are not created
  yet (DHL Parcel DE API). Tracking numbers can be entered in the order drawer.
- **GA4** (`TODO(ga4)`): "Connect GA4" is a placeholder (button + toast) as agreed.
- **WhatsApp** (`TODO(whatsapp)`): the toggle is stored; sending needs a WhatsApp Business API provider.
- **Newsletter double opt-in** (`TODO(double-opt-in)`): sign-ups are stored with `confirmed_at = null`.
- **Product images upload** (`TODO(images)`): the product modal from the design has no image field; new products show a placeholder.
- **Impressum / invoice placeholders:** owner name and tax number (`src/config/business.ts`, `src/i18n/policies.ts`).
