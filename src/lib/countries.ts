import type { Lang } from './types';

// Shipping countries offered at checkout (order as in the design). DE ships at the domestic rate.
export const COUNTRIES: { code: string; de: string; en: string }[] = [
  { code: 'DE', de: 'Deutschland', en: 'Germany' },
  { code: 'AT', de: 'Österreich', en: 'Austria' },
  { code: 'CH', de: 'Schweiz', en: 'Switzerland' },
  { code: 'NL', de: 'Niederlande', en: 'Netherlands' },
  { code: 'BE', de: 'Belgien', en: 'Belgium' },
  { code: 'FR', de: 'Frankreich', en: 'France' },
  { code: 'IT', de: 'Italien', en: 'Italy' },
  { code: 'ES', de: 'Spanien', en: 'Spain' },
  { code: 'PL', de: 'Polen', en: 'Poland' },
  { code: 'DK', de: 'Dänemark', en: 'Denmark' },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export function countryName(code: string, lang: Lang) {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? c[lang] : code;
}
