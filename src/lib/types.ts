export type Lang = 'de' | 'en';

export interface Variant {
  id: string;
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  /** Colour variants share a model name (see lib/models.ts); empty for standalone products. */
  model: string;
  /** Sold before it is in stock; variant stock is the pre-order quota. */
  preorder: boolean;
  /** Expected shipping date (YYYY-MM-DD) for pre-orders. */
  shipsFrom: string | null;
  /** Products with the same set name are offered together on the product page. */
  setName: string;
  color: string;
  materialDe: string;
  materialEn: string;
  weightG: number | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  careDe: string | null;
  careEn: string | null;
  images: string[];
  visible: boolean;
  lowStock: number;
  sortOrder: number;
  variants: Variant[];
}

export interface SiteSettings {
  freeShipCents: number;
  shipDeCents: number;
  shipIntlCents: number;
  usdRate: number;
  popupEnabled: boolean;
  popupCode: string;
  popupPct: number;
  popupUntil: string;
  annLeft: string[];
  annRight: string[];
}

export interface DiscountCode {
  code: string;
  isPercent: boolean;
  value: number;
  minOrderCents: number;
  validUntil: string | null;
  usageLimit: number | null;
  usedCount: number;
  firstOrderOnly: boolean;
  active: boolean;
}

export interface Drop {
  id: string;
  name: string;
  liveAt: string;
  lockShop: boolean;
}

/** Cart line kept in localStorage under `tic-cart-v3` (same shape as the prototype). */
export interface CartLine {
  id: string;
  name: string;
  eur: number;
  color: string;
  size: string;
  qty: number;
}
