import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { consignee } = await import('@/lib/dhl');

const base = { firstName: 'Maria', lastName: 'Muster', street: 'Hauptstr. 5', extra: '', zip: '10115', city: 'Berlin', country: 'DE' };

describe('dhl consignee', () => {
  it('maps a German doorstep address', () => {
    expect(consignee(base)).toEqual({ name1: 'Maria Muster', addressStreet: 'Hauptstr. 5', postalCode: '10115', city: 'Berlin', country: 'DEU' });
  });

  it('puts the address extra into name2 (printed on German labels)', () => {
    expect(consignee({ ...base, extra: 'c/o Schmidt' })).toMatchObject({ name2: 'c/o Schmidt' });
  });

  it('maps EU countries to ISO alpha-3', () => {
    expect(consignee({ ...base, country: 'AT', zip: '1010', city: 'Wien' })).toMatchObject({ country: 'AUT' });
  });

  it('detects a Packstation with Postnummer', () => {
    expect(consignee({ ...base, street: 'Packstation 118', extra: 'Postnummer 12345678' })).toEqual({
      name: 'Maria Muster',
      lockerID: 118,
      postNumber: '12345678',
      postalCode: '10115',
      city: 'Berlin',
      country: 'DEU',
    });
  });

  it('rejects countries outside the shipping list', () => {
    expect(() => consignee({ ...base, country: 'US' })).toThrow();
  });
});
