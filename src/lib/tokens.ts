// Shared status tones (used by the dashboard and the account/tracking status pills).
export const TONE = {
  blue: ['rgba(124,156,255,.14)', '#A9BCFF'],
  red: ['rgba(255,107,94,.14)', '#FF6B5E'],
  amber: ['rgba(242,181,68,.14)', '#F2B544'],
  grey: ['rgba(255,255,255,.07)', '#C4C8CF'],
  green: ['rgba(78,210,154,.14)', '#4ED29A'],
} as const;

export type Tone = keyof typeof TONE;

// Storefront status pill backgrounds (Account order list, tracking).
export const STORE_STATUS_BG: Record<string, string> = {
  shipped: '#9EF2FF',
  delivered: '#E4E4E4',
};
