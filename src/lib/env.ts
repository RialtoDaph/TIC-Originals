// Central access to environment variables, with clear errors when one is missing.

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. See README → Environment variables.`);
  return value;
}

// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them in client bundles.
export const publicEnv = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  stripePublishableKey: () =>
    required('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
  siteUrl: () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  imageBaseUrl: () => (process.env.NEXT_PUBLIC_IMAGE_BASE_URL || '').replace(/\/$/, ''),
};

export const serverEnv = {
  supabaseServiceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
  stripeSecretKey: () => required('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY),
  stripeWebhookSecret: () => required('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET),
  // Optional integrations: features degrade gracefully (logged, reported in the UI) when unset.
  resendApiKey: () => process.env.RESEND_API_KEY || '',
  emailFrom: () => process.env.EMAIL_FROM || 'TIC Originals <company@ticoriginals.com>',
  ownerEmail: () => process.env.OWNER_EMAIL || 'company@ticoriginals.com',
  telegramBotToken: () => process.env.TELEGRAM_BOT_TOKEN || '',
};
