import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Lang } from './types';
import { sendEmail } from './email';
import { newsletterConfirmEmail } from '@/i18n/emails';

const RESEND_AFTER_MS = 10 * 60 * 1000;

/**
 * Starts double opt-in: stores the address as unconfirmed and emails a confirmation link.
 * Already confirmed addresses are left alone, and a pending one is re-sent at most every 10 minutes
 * so the form cannot be used to spam a third party's inbox.
 */
export async function requestNewsletterConfirmation(admin: SupabaseClient, email: string, source: string, lang: Lang): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const { data: existing, error: readErr } = await admin
    .from('newsletter_subscribers')
    .select('token, confirmed_at, confirmation_sent_at')
    .eq('email', e)
    .maybeSingle();
  if (readErr) {
    console.error('newsletter read', readErr);
    return false;
  }
  if (existing?.confirmed_at) return true;
  if (existing?.confirmation_sent_at && Date.now() - new Date(existing.confirmation_sent_at).getTime() < RESEND_AFTER_MS) return true;

  let token = existing?.token as string | undefined;
  if (!existing) {
    const { data, error } = await admin
      .from('newsletter_subscribers')
      .upsert({ email: e, source: source.slice(0, 40), lang }, { onConflict: 'email', ignoreDuplicates: true })
      .select('token')
      .maybeSingle();
    if (error) {
      console.error('newsletter insert', error);
      return false;
    }
    token = data?.token;
    if (!token) {
      const again = await admin.from('newsletter_subscribers').select('token').eq('email', e).maybeSingle();
      token = again.data?.token;
    }
  }
  if (!token) return false;

  const mail = newsletterConfirmEmail(token, lang);
  const r = await sendEmail({ to: e, subject: mail.subject, text: mail.text });
  if (r.sent) await admin.from('newsletter_subscribers').update({ confirmation_sent_at: new Date().toISOString() }).eq('email', e);
  return r.sent || r.reason === 'not_configured';
}
