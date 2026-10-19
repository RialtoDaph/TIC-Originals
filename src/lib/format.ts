import type { Lang } from './types';

const locale = (lang: Lang) => (lang === 'de' ? 'de-DE' : 'en-US');

export function fmtMoney(eur: number, lang: Lang, currency: 'EUR' | 'USD' = 'EUR') {
  return new Intl.NumberFormat(locale(lang), { style: 'currency', currency }).format(eur);
}

export function fmtCents(cents: number, lang: Lang) {
  return fmtMoney(cents / 100, lang);
}

export function fmtDate(iso: string | Date, lang: Lang) {
  return new Date(iso).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function fmtDateTime(iso: string | Date, lang: Lang) {
  return new Date(iso).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Amounts in running text: no decimals for whole euros ("80 €", "€80"), otherwise two ("5,19 €"). */
export function fmtAmount(cents: number, lang: Lang) {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(locale(lang), {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}
