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
  /** When the customer's withdrawal (Widerruf) declaration arrived through the website, if any. */
  withdrawnAt: string | null;
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
  hasLabel: boolean;
  labelError: string;
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
  model: string;
  preorder: boolean;
  shipsFrom: string | null;
  setName: string;
  color: string;
  materialDe: string;
  materialEn: string;
  weightG: number | null;
  descriptionDe: string;
  descriptionEn: string;
  careDe: string;
  careEn: string;
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

export const EXPENSE_CATEGORIES = ['production', 'shipping', 'packaging', 'marketing', 'software', 'fees', 'other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface OReceipt {
  id: string;
  name: string;
  mime: string;
  sizeBytes: number;
  uploadedAt: string;
}

/** A business expense. Cash basis: counted on `paidOn` (YYYY-MM-DD, the day the money left the account). */
export interface OExpense {
  id: string;
  paidOn: string;
  category: ExpenseCategory;
  vendor: string;
  invoiceNo: string;
  description: string;
  /** Gross EUR cents. Negative = credit note. */
  amountCents: number;
  receipts: OReceipt[];
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
  expenses: OExpense[];
  /** False when the expenses table is missing (migration not applied yet): the Finanzen tab then shows a notice. */
  financeReady: boolean;
  /** Every order that was ever paid, including ones hidden from the dashboard: they stay in the books (GoBD). */
  financeOrders: OOrder[];
}

export type Tab = 'today' | 'orders' | 'products' | 'insights' | 'finance' | 'promo' | 'settings';
export const TABS: Tab[] = ['today', 'orders', 'products', 'insights', 'finance', 'promo', 'settings'];
