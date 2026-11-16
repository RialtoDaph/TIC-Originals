import { describe, expect, it } from 'vitest';
import { isValidOtp } from '@/lib/otp';

describe('isValidOtp', () => {
  it('accepts the 6-digit (local) and 8-digit (hosted) Supabase codes', () => {
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('69714196')).toBe(true);
    expect(isValidOtp(' 69714196 ')).toBe(true);
  });
  it('rejects too short, too long and non-numeric input', () => {
    expect(isValidOtp('12345')).toBe(false);
    expect(isValidOtp('12345678901')).toBe(false);
    expect(isValidOtp('1234abcd')).toBe(false);
    expect(isValidOtp('')).toBe(false);
  });
});
