import { describe, expect, it } from 'vitest';
import { addressErrors, cleanAddress } from '@/lib/validation';
import { sanitizeItems } from '@/lib/checkout-items';
import { sx } from '@/components/owner/sx';

const ok = { email: 'a@b.de', first: 'A', last: 'B', street: 'Weg 1', extra: '', zip: '85072', city: 'Eichstätt', country: 'DE', phone: '' };

describe('addressErrors (checkout form rules)', () => {
  it('passes a complete address', () => expect(addressErrors(ok)).toEqual({}));
  it('requires fields, a valid email and a 5-digit German postcode', () => {
    expect(addressErrors({ ...ok, first: ' ' }).first).toBe('req');
    expect(addressErrors({ ...ok, email: 'nope' }).email).toBe('badEmail');
    expect(addressErrors({ ...ok, zip: '1234' }).zip).toBe('badZip');
    expect(addressErrors({ ...ok, zip: '1010', country: 'AT' }).zip).toBeUndefined();
    expect(addressErrors({ ...ok, country: 'US' }).country).toBe('req');
  });
  it('cleans untrusted input', () => {
    expect(cleanAddress({ email: ' A@B.DE ', country: 'de', first: 5 })).toMatchObject({ email: 'a@b.de', country: 'DE', first: '' });
  });
});

describe('sanitizeItems', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  it('merges duplicates, drops junk and caps quantities', () => {
    expect(
      sanitizeItems([
        { id, size: 'M', qty: 2 },
        { id, size: 'M', qty: 1 },
        { id: 'p1', size: 'M', qty: 1 },
        { id, size: 'L', qty: 0 },
        { id, size: 'S', qty: 500 },
        null,
      ]),
    ).toEqual([
      { id, size: 'M', qty: 3 },
      { id, size: 'S', qty: 99 },
    ]);
  });
});

describe('sx', () => {
  it('converts reference CSS strings to style objects', () => {
    expect(sx("height:36px;font-family:'DM Mono',monospace;background:url(data:x;y);--x:1")).toEqual({
      height: '36px',
      fontFamily: "'DM Mono',monospace",
      background: 'url(data:x;y)',
      '--x': '1',
    });
  });
});
