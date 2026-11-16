/**
 * Email OTP codes are issued by Supabase Auth. Their length is a dashboard setting
 * (Auth → Email → OTP length) and has differed between local config (6) and the hosted
 * project (8). Accept the whole range Supabase allows so a settings change never locks
 * customers out of registration; Supabase itself is the authority on correctness.
 */
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;

export const isValidOtp = (raw: string): boolean => new RegExp(`^\\d{${OTP_MIN_LENGTH},${OTP_MAX_LENGTH}}$`).test(raw.trim());
