'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from '../StoreProvider';
import { StoreHeader } from '../Headers';
import { PoliciesFooter } from '../Footers';
import { submitWithdrawal } from '@/app/(store)/withdrawal-actions';
import s from './Policies.module.css';

const COPY = {
  de: {
    eyebrow: 'Widerrufsfunktion',
    title: 'Vertrag widerrufen',
    intro: 'Du kannst deine Bestellung innerhalb von 14 Tagen ab Erhalt der Ware ohne Angabe von Gründen widerrufen. Gib dazu deinen Namen, die Bestellnummer und deine E-Mail-Adresse an. Die Eingangsbestätigung schicken wir dir sofort an diese E-Mail-Adresse.',
    name: 'Name',
    order: 'Bestellnummer',
    orderHint: 'Steht in deiner Bestellbestätigung, z. B. TIC-2026-ABC123',
    email: 'E-Mail für die Eingangsbestätigung',
    statement: (no: string) => `Mit „Widerruf bestätigen“ widerrufe ich den Vertrag über die Bestellung ${no || '…'}.`,
    confirm: 'Widerruf bestätigen',
    sending: 'Wird gesendet …',
    invalid: 'Bitte Name, Bestellnummer und eine gültige E-Mail-Adresse angeben.',
    limit: 'Zu viele Versuche. Bitte später erneut versuchen oder an company@ticoriginals.com schreiben.',
    failed: 'Das hat nicht geklappt. Bitte erneut versuchen oder den Widerruf an company@ticoriginals.com schicken.',
    doneTitle: 'Widerruf eingegangen',
    done: (no: string, when: string, email: string) => `Dein Widerruf für die Bestellung ${no} ist am ${when} bei uns eingegangen. Die Eingangsbestätigung haben wir an ${email} geschickt.`,
    next: 'Bitte schick die Ware innerhalb von 14 Tagen an TILL I COLLAPSE ORIGINALS, An der Oberen Au 4, 85072 Eichstätt. Die Rückzahlung erhältst du über dein ursprüngliches Zahlungsmittel, sobald die Ware da ist oder du die Rücksendung nachweist. Noch nicht versendete Bestellungen erstatten wir direkt.',
    more: 'Widerrufsbelehrung lesen',
  },
  en: {
    eyebrow: 'Withdrawal function',
    title: 'Withdraw from contract',
    intro: 'You can withdraw from your order within 14 days of receiving the goods without giving a reason. Enter your name, the order number and your email address. We send the receipt to this email address right away.',
    name: 'Name',
    order: 'Order number',
    orderHint: 'Shown in your order confirmation, e.g. TIC-2026-ABC123',
    email: 'Email for the receipt',
    statement: (no: string) => `By clicking "Confirm withdrawal" I withdraw from the contract for order ${no || '…'}.`,
    confirm: 'Confirm withdrawal',
    sending: 'Sending …',
    invalid: 'Please enter your name, the order number and a valid email address.',
    limit: 'Too many attempts. Please try again later or write to company@ticoriginals.com.',
    failed: "That didn't work. Please try again or send your withdrawal to company@ticoriginals.com.",
    doneTitle: 'Withdrawal received',
    done: (no: string, when: string, email: string) => `We received your withdrawal for order ${no} on ${when}. The receipt has been sent to ${email}.`,
    next: 'Please send the goods within 14 days to TILL I COLLAPSE ORIGINALS, An der Oberen Au 4, 85072 Eichstätt, Germany. You get your money back via your original payment method once the goods have arrived or you have shown proof of return. Orders that have not shipped yet are refunded right away.',
    more: 'Read the withdrawal policy',
  },
} as const;

export function WithdrawalPage({ initialOrder }: { initialOrder: string }) {
  const { lang } = useStore();
  const c = COPY[lang];
  const [f, setF] = useState({ name: '', orderNo: initialOrder, email: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'invalid' | 'limit' | 'failed'>('idle');
  const [done, setDone] = useState<{ no: string; when: string; email: string } | null>(null);

  const field = (k: keyof typeof f, label: string, type = 'text', hint?: string) => (
    <label className={s.cLabel}>
      <span className={s.cLabelT}>{label}</span>
      <input
        type={type}
        className={s.cInput}
        value={f[k]}
        autoComplete={k === 'name' ? 'name' : k === 'email' ? 'email' : 'off'}
        onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))}
        required
      />
      {hint && <span className={s.cHint}>{hint}</span>}
    </label>
  );

  return (
    <div className={s.page}>
      <StoreHeader variant="policies" />
      <section className={s.hero}>
        <div className={s.noise} />
        <div className={s.heroInner}>
          <div className={s.eyebrowRow}>
            <span className={s.eyebrowLine} />
            <span className={s.eyebrow}>{c.eyebrow}</span>
          </div>
          <h1 className={s.h1}>{done ? c.doneTitle : c.title}</h1>
        </div>
      </section>
      <div className={s.body}>
        <div className={s.main}>
          {done ? (
            <div className={s.formWrap} role="status">
              <p className={s.text}>{c.done(done.no, done.when, done.email)}</p>
              <p className={s.text}>{c.next}</p>
              <Link href="/policies/widerruf" className={s.text}>
                {c.more} →
              </Link>
            </div>
          ) : (
            <form
              className={s.contactForm}
              style={{ maxWidth: 560 }}
              onSubmit={async (e) => {
                e.preventDefault();
                setState('busy');
                const r = await submitWithdrawal({ ...f, lang }).catch(() => ({ ok: false as const, error: 'failed' as const }));
                if (!r.ok) return setState(r.error);
                const when = new Date(r.receivedAt).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB', { timeZone: 'Europe/Berlin', dateStyle: 'long', timeStyle: 'short' });
                setDone({ no: f.orderNo.trim().toUpperCase(), when, email: f.email.trim() });
              }}
            >
              <p className={s.text}>{c.intro}</p>
              {field('name', c.name)}
              {field('orderNo', c.order, 'text', c.orderHint)}
              {field('email', c.email, 'email')}
              <p className={s.text}>{c.statement(f.orderNo.trim().toUpperCase())}</p>
              {(state === 'invalid' || state === 'limit' || state === 'failed') && (
                <span className={s.err} role="alert">
                  {c[state]}
                </span>
              )}
              <button className={s.sendBtn} disabled={state === 'busy'}>
                {state === 'busy' ? c.sending : c.confirm}
              </button>
            </form>
          )}
        </div>
      </div>
      <PoliciesFooter />
    </div>
  );
}
