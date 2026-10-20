import type { DiscountCode, SiteSettings } from '@/lib/types';

export interface OItem {
  productId: string | null;
  name: string;
  size: string;
  qty: number;
  unitCents: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface OOrder {
  id: string;
  no: string;
  placedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  returnedAt: string | null;
  refundedAt: string | null;
  remindedAt: string | null;
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  extra: string;
  zip: string;
  city: string;
  country: string;
  phone: string;
  subtotalCents: number;
  discountCode: string | null;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  refundedCents: number;
  status: OrderStatus;
  payment: PaymentStatus;
  method: string;
  carrier: string;
  tracking: string;
  note: string;
  flags: string[];
  invoiceNo: string | null;
  items: OItem[];
}

export interface OVariant {
  id: string;
  size: string;
  stock: number;
}

export interface OProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  images: string[];
  visible: boolean;
  lowStock: number;
  variants: OVariant[];
  /** Waitlist signups per size. */
  waitlist: Record<string, number>;
  restockOrdered: boolean;
}

export interface OBundle {
  id: string;
  name: string;
  summary: string;
  normalCents: number;
  priceCents: number;
  active: boolean;
}

export interface OCart {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  items: { productId: string; name: string; size: string; qty: number }[];
  valueCents: number;
  reminded: boolean;
}

export interface ODrop {
  id: string;
  name: string;
  liveAt: string;
  lockShop: boolean;
  /** Stock per variant id when the drop went live. */
  snapshot: Record<string, number> | null;
  /** First time any size sold out after the drop went live. */
  firstSoldOutAt: string | null;
}

export interface OActivity {
  id: number;
  at: string;
  text: string;
  taskKey: string | null;
  canUndo: boolean;
}

export interface ONotif {
  tg: boolean;
  tgId: string;
  wa: boolean;
  waNo: string;
  events: string[];
}

export interface OwnerData {
  now: string;
  orders: OOrder[];
  products: OProduct[];
  codes: DiscountCode[];
  bundles: OBundle[];
  carts: OCart[];
  /** Newest first; drops[0] is the one edited under Promo. */
  drops: ODrop[];
  settings: SiteSettings;
  notif: ONotif;
  activity: OActivity[];
  vipSent: string[];
  kuAcked: boolean;
}

export type Tab = 'today' | 'orders' | 'products' | 'insights' | 'promo' | 'settings';
export const TABS: Tab[] = ['today', 'orders', 'products', 'insights', 'promo', 'settings'];
