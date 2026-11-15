'use server';

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { serverEnv } from '@/lib/env';
import { allowRequest } from '@/lib/rate-limit';
import { withdrawalReceipt } from '@/i18n/emails';
import type { Lang } from '@/lib/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WithdrawalResult = { ok: true; receivedAt: string } | { ok: false; error: 'invalid' | 'limit' | 'failed' };

/**
 * Second step of the withdrawal function ("Widerruf bestätigen"). Records the declaration, sends the
 * customer the receipt on a durable medium (email with content, date and time) and tells the owner.
 * The declaration is accepted even when the order number can't be matched; the owner follows up.
 */
export async function submitWithdrawal(input: { name: string; orderNo: string; email: string; lang: Lang }): Promise<WithdrawalResult> {
  const name = input.name.trim().replace(/\s+/g, ' ').slice(0, 200);
  const orderNo = input.orderNo.trim().toUpperCase().slice(0, 60);
  const email = input.email.trim().toLowerCase().slice(0, 254);
  const lang: Lang = input.lang === 'en' ? 'en' : 'de';
  if (!name || !orderNo || !EMAIL_RE.test(email)) return { ok: false, error: 'invalid' };

  const admin = createAdminClient();
  if (!(await allowRequest(admin, 'withdrawal', await headers(), 10, 3600))) return { ok: false, error: 'limit' };

  // Link to the order only when number and email belong together (no lookup of other people's orders).
  const { data: order } = await admin.from('orders').select('id, email').eq('order_no', orderNo).maybeSingle();
  const orderId = order && (order.email as string).toLowerCase() === email ? (order.id as string) : null;

  const { data: row, error } = await admin.from('withdrawals').insert({ name, order_no: orderNo, email, lang, order_id: orderId }).select('received_at').single();
  if (error || !row) {
    console.error('[withdrawal] insert failed', error);
    return { ok: false, error: 'failed' };
  }
  if (orderId) {
    const { error: flagErr } = await admin.rpc('flag_order', { p_order_id: orderId, p_flag: 'withdrawal' });
    if (flagErr) console.error('[withdrawal] flag failed', flagErr);
  }

  const receivedAt = row.received_at as string;
  const receipt = withdrawalReceipt({ name, orderNo, email, receivedAt }, lang);
  const sent = await sendEmail({ to: email, ...receipt });
  if (!sent.sent) console.error('[withdrawal] receipt not sent', orderNo);
  await sendEmail({
    to: serverEnv.ownerEmail(),
    replyTo: email,
    subject: `Widerruf eingegangen: ${orderNo}`,
    text: `${receipt.text}\n\n${orderId ? 'Bestellung gefunden und im Dashboard markiert.' : 'ACHTUNG: Bestellnummer und E-Mail passen zu keiner Bestellung. Bitte beim Kunden nachfragen.'}`,
  });
  return { ok: true, receivedAt };
}
