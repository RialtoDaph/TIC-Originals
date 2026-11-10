import type { Lang } from './types';

// Shipping countries offered at checkout: Germany and the rest of the EU (rest of the world later).
// DE ships at the domestic rate, every other country at the EU rate.
export const COUNTRIES: { code: string; de: string; en: string }[] = [
  { code: 'DE', de: 'Deutschland', en: 'Germany' },
  { code: 'AT', de: 'Österreich', en: 'Austria' },
  { code: 'NL', de: 'Niederlande', en: 'Netherlands' },
  { code: 'BE', de: 'Belgien', en: 'Belgium' },
  { code: 'FR', de: 'Frankreich', en: 'France' },
  { code: 'IT', de: 'Italien', en: 'Italy' },
  { code: 'ES', de: 'Spanien', en: 'Spain' },
  { code: 'PL', de: 'Polen', en: 'Poland' },
  { code: 'DK', de: 'Dänemark', en: 'Denmark' },
  { code: 'SE', de: 'Schweden', en: 'Sweden' },
  { code: 'FI', de: 'Finnland', en: 'Finland' },
  { code: 'IE', de: 'Irland', en: 'Ireland' },
  { code: 'PT', de: 'Portugal', en: 'Portugal' },
  { code: 'LU', de: 'Luxemburg', en: 'Luxembourg' },
  { code: 'CZ', de: 'Tschechien', en: 'Czechia' },
  { code: 'SK', de: 'Slowakei', en: 'Slovakia' },
  { code: 'SI', de: 'Slowenien', en: 'Slovenia' },
  { code: 'HU', de: 'Ungarn', en: 'Hungary' },
  { code: 'HR', de: 'Kroatien', en: 'Croatia' },
  { code: 'RO', de: 'Rumänien', en: 'Romania' },
  { code: 'BG', de: 'Bulgarien', en: 'Bulgaria' },
  { code: 'GR', de: 'Griechenland', en: 'Greece' },
  { code: 'EE', de: 'Estland', en: 'Estonia' },
  { code: 'LV', de: 'Lettland', en: 'Latvia' },
  { code: 'LT', de: 'Litauen', en: 'Lithuania' },
  { code: 'CY', de: 'Zypern', en: 'Cyprus' },
  { code: 'MT', de: 'Malta', en: 'Malta' },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export function countryName(code: string, lang: Lang) {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? c[lang] : code;
}
