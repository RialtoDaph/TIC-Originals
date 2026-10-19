import { COUNTRY_CODES } from './countries';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AddressInput {
  email: string;
  first: string;
  last: string;
  street: string;
  extra: string;
  zip: string;
  city: string;
  country: string;
  phone: string;
}

export type FieldError = 'req' | 'badEmail' | 'badZip';

/** Checkout form rules from the design: required fields, email format, 5-digit German postcode. */
export function addressErrors(f: AddressInput): Partial<Record<keyof AddressInput, FieldError>> {
  const e: Partial<Record<keyof AddressInput, FieldError>> = {};
  (['email', 'first', 'last', 'street', 'zip', 'city'] as const).forEach((k) => {
    if (!f[k].trim()) e[k] = 'req';
  });
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) e.email = 'badEmail';
  if (f.zip.trim() && f.country === 'DE' && !/^\d{5}$/.test(f.zip.trim())) e.zip = 'badZip';
  if (!COUNTRY_CODES.includes(f.country)) e.country = 'req';
  return e;
}

export function cleanAddress(raw: Record<string, unknown>): AddressInput {
  const str = (k: string, max = 200) => (typeof raw[k] === 'string' ? (raw[k] as string).trim().slice(0, max) : '');
  return {
    email: str('email', 254).toLowerCase(),
    first: str('first'),
    last: str('last'),
    street: str('street'),
    extra: str('extra'),
    zip: str('zip', 20),
    city: str('city'),
    country: str('country', 2).toUpperCase(),
    phone: str('phone', 40),
  };
}
