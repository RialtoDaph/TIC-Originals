import 'server-only';
import { createAdminClient } from './supabase/admin';
import { serverEnv } from './env';

export type NotifyEvent = 'order' | 'stock' | 'refund' | 'drop' | 'test';

export interface NotifyResult {
  telegram: 'sent' | 'off' | 'not_configured' | 'failed';
  whatsapp: 'off' | 'not_supported';
}

/**
 * Owner notifications configured under Settings → Notifications.
 * Telegram is sent through the Bot API (TELEGRAM_BOT_TOKEN). WhatsApp needs a WhatsApp Business API
 * provider; until one is chosen the toggle is stored but nothing is sent.
 */
export async function notifyOwner(event: NotifyEvent, text: string): Promise<NotifyResult> {
  const result: NotifyResult = { telegram: 'off', whatsapp: 'off' };
  try {
    const supabase = createAdminClient();
    const { data: cfg } = await supabase.from('owner_settings').select('*').eq('id', 1).maybeSingle();
    if (!cfg) return result;
    const wanted = event === 'test' || (cfg.notify_events as string[]).includes(event);
    if (!wanted) return result;
    if (cfg.notify_whatsapp) {
      // TODO(whatsapp): integrate a WhatsApp Business API provider (e.g. Twilio or Meta Cloud API).
      result.whatsapp = 'not_supported';
    }
    if (cfg.notify_telegram && cfg.telegram_chat) {
      const token = serverEnv.telegramBotToken();
      if (!token) {
        result.telegram = 'not_configured';
      } else {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: cfg.telegram_chat, text }),
        });
        result.telegram = res.ok ? 'sent' : 'failed';
        if (!res.ok) console.error('[notify] telegram', res.status, await res.text());
      }
    }
  } catch (e) {
    console.error('[notify] failed', e);
    result.telegram = 'failed';
  }
  return result;
}
