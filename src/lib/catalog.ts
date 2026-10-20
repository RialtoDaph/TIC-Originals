import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Drop, Product, SiteSettings } from './types';

export const SIZES = ['S', 'M', 'L', 'XL'];

type Row = Record<string, unknown>;

export function mapProduct(r: Row): Product {
  const variants = ((r.product_variants as Row[] | null) ?? [])
    .map((v) => ({ id: v.id as string, size: v.size as string, stock: v.stock as number, sort: v.sort_order as number }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ id, size, stock }) => ({ id, size, stock }));
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    category: r.category as string,
    priceCents: r.price_cents as number,
    color: r.color as string,
    materialDe: r.material_de as string,
    materialEn: r.material_en as string,
    weightG: (r.weight_g as number | null) ?? null,
    descriptionDe: (r.description_de as string | null) ?? null,
    descriptionEn: (r.description_en as string | null) ?? null,
    careDe: (r.care_de as string | null) ?? null,
    careEn: (r.care_en as string | null) ?? null,
    images: (r.images as string[]) ?? [],
    visible: r.visible as boolean,
    lowStock: r.low_stock_threshold as number,
    sortOrder: r.sort_order as number,
    variants,
  };
}

export const PRODUCT_SELECT = '*, product_variants(id, size, stock, sort_order)';

/** Products visible to the current client (RLS hides invisible ones from shoppers). */
export async function loadProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).order('sort_order').order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export function mapSettings(r: Row): SiteSettings {
  return {
    freeShipCents: r.free_ship_cents as number,
    shipDeCents: r.ship_de_cents as number,
    shipIntlCents: r.ship_intl_cents as number,
    usdRate: Number(r.usd_rate),
    popupEnabled: r.popup_enabled as boolean,
    popupCode: r.popup_code as string,
    popupPct: r.popup_pct as number,
    popupUntil: r.popup_until as string,
    annLeft: (r.ann_left as string[]) ?? [],
    annRight: (r.ann_right as string[]) ?? [],
  };
}

export const DEFAULT_SETTINGS: SiteSettings = {
  freeShipCents: 8000,
  shipDeCents: 519,
  shipIntlCents: 1419,
  usdRate: 1.1,
  popupEnabled: false,
  popupCode: '',
  popupPct: 0,
  popupUntil: '',
  annLeft: [],
  annRight: [],
};

export async function loadSettings(supabase: SupabaseClient): Promise<SiteSettings> {
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data ? mapSettings(data) : DEFAULT_SETTINGS;
}

export function mapDrop(r: Row): Drop {
  return { id: r.id as string, name: r.name as string, liveAt: r.live_at as string, lockShop: r.lock_shop as boolean };
}

/** The most recently scheduled drop (the one edited in Promo → Drop schedule). */
export async function loadCurrentDrop(supabase: SupabaseClient): Promise<Drop | null> {
  const { data, error } = await supabase.from('drops').select('*').order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0] ? mapDrop(data[0]) : null;
}
