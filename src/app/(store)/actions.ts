'use server';

import { requestNewsletterConfirmation } from '@/lib/newsletter';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { serverEnv } from '@/lib/env';
import { allowRequest } from '@/lib/rate-limit';
import type { Lang } from '@/lib/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeNewsletter(email: string, source: string, lang: Lang): Promise<{ ok: boolean }> {
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e) || e.length > 254) return { ok: false };
  const supabase = createAdminClient();
  if (!(await allowRequest(supabase, 'newsletter', await headers(), 10, 3600))) return { ok: false };
  const ok = await requestNewsletterConfirmation(supabase, e, source, lang === 'en' ? 'en' : 'de');
  return { ok };
}

export async function sendContactMessage(input: { name: string; email: string; subject: string; message: string }): Promise<{ ok: boolean }> {
  const name = input.name.trim().slice(0, 200);
  const email = input.email.trim().slice(0, 254);
  const subject = input.subject.trim().slice(0, 300);
  const message = input.message.trim().slice(0, 5000);
  if (!name || !EMAIL_RE.test(email) || !message) return { ok: false };
  const supabase = createAdminClient();
  if (!(await allowRequest(supabase, 'contact', await headers(), 5, 3600))) return { ok: false };
  const { error } = await supabase.from('contact_messages').insert({ name, email, subject, message });
  if (error) {
    console.error('contact', error);
    return { ok: false };
  }
  await sendEmail({
    to: serverEnv.ownerEmail(),
    replyTo: email,
    subject: `Kontakt: ${subject || '(kein Betreff)'}`,
    text: `${name} <${email}>\n\n${message}`,
  });
  return { ok: true };
}
