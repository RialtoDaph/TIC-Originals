import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BUSINESS } from '@/config/business';

/*
 * DHL Parcel DE Shipping API v2 (Post & Parcel Germany), OAuth2 ROPC.
 * Docs: https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2
 *
 * Env:
 *   DHL_API_KEY, DHL_API_SECRET   app credentials from developer.dhl.com (client_id / client_secret)
 *   DHL_GKP_USER, DHL_GKP_PASSWORD business customer portal user (ideally a "system user")
 *   DHL_EKP                       10-digit customer number; billing number = EKP + product procedure + participation
 *   DHL_PARTICIPATION             optional, default "01" (two characters, from the DHL contract)
 *   DHL_PRINT_FORMAT              optional label format (e.g. A4, 910-300-300); default = GKP setting
 *   DHL_SANDBOX=1                 use the DHL sandbox (test labels, never for real orders)
 *
 * Labels are only created automatically in production mode. The sandbox is used by the
 * "DHL testen" button in the owner settings.
 */

const PROFILE = 'STANDARD_GRUPPENPROFIL';
const BUCKET = 'shipping-labels';
// Fallback when a product has no weight set, plus packaging.
const DEFAULT_ITEM_G = 600;
const PACKAGING_G = 200;

type Mode = 'production' | 'sandbox';

interface Config {
  mode: Mode;
  base: string;
  tokenUrl: string;
  key: string;
  secret: string;
  user: string;
  password: string;
  billing: (product: Product) => string;
  printFormat: string;
}

type Product = 'V01PAK' | 'V53WPAK';
const PROCEDURE: Record<Product, string> = { V01PAK: '01', V53WPAK: '53' };
// Published sandbox billing numbers (EKP 3333333333).
const SANDBOX_BILLING: Record<Product, string> = { V01PAK: '33333333330102', V53WPAK: '33333333335301' };

function config(mode: Mode): Config | null {
  const key = process.env.DHL_API_KEY || '';
  const secret = process.env.DHL_API_SECRET || '';
  if (!key || !secret) return null;
  const printFormat = process.env.DHL_PRINT_FORMAT || '';
  if (mode === 'sandbox') {
    return {
      mode,
      base: 'https://api-sandbox.dhl.com/parcel/de/shipping/v2',
      tokenUrl: 'https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token',
      key,
      secret,
      user: 'user-valid',
      password: 'SandboxPasswort2023!',
      billing: (p) => SANDBOX_BILLING[p],
      printFormat,
    };
  }
  const user = process.env.DHL_GKP_USER || '';
  const password = process.env.DHL_GKP_PASSWORD || '';
  const ekp = (process.env.DHL_EKP || '').replace(/\s/g, '');
  const part = process.env.DHL_PARTICIPATION || '01';
  if (!user || !password || !/^\d{10}$/.test(ekp)) return null;
  return {
    mode,
    base: 'https://api-eu.dhl.com/parcel/de/shipping/v2',
    tokenUrl: 'https://api-eu.dhl.com/parcel/de/account/auth/ropc/v1/token',
    key,
    secret,
    user,
    password,
    billing: (p) => ekp + PROCEDURE[p] + part,
    printFormat,
  };
}

/** Production label creation is configured (and not switched to the sandbox). */
export function dhlLive(): boolean {
  return process.env.DHL_SANDBOX !== '1' && !!config('production');
}

/** What the owner settings show: off, sandbox only (keys but no business account yet), or live. */
export function dhlStatus(): 'off' | 'sandbox' | 'live' {
  if (dhlLive()) return 'live';
  return config('sandbox') ? 'sandbox' : 'off';
}

const tokens = new Map<Mode, { token: string; exp: number }>();

async function token(cfg: Config): Promise<string> {
  const hit = tokens.get(cfg.mode);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', username: cfg.user, password: cfg.password, client_id: cfg.key, client_secret: cfg.secret }),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !body.access_token) throw new DhlError(`DHL login failed (${res.status}): ${body.error_description || body.error || 'no token'}`);
  tokens.set(cfg.mode, { token: body.access_token, exp: Date.now() + (body.expires_in ?? 1800) * 1000 });
  return body.access_token;
}

export class DhlError extends Error {}

// Checkout countries (ISO alpha-2) → ISO 3166-1 alpha-3 as DHL expects.
const ALPHA3: Record<string, string> = {
  DE: 'DEU', AT: 'AUT', NL: 'NLD', BE: 'BEL', FR: 'FRA', IT: 'ITA', ES: 'ESP', PL: 'POL', DK: 'DNK', SE: 'SWE',
  FI: 'FIN', IE: 'IRL', PT: 'PRT', LU: 'LUX', CZ: 'CZE', SK: 'SVK', SI: 'SVN', HU: 'HUN', HR: 'HRV', RO: 'ROU',
  BG: 'BGR', GR: 'GRC', EE: 'EST', LV: 'LVA', LT: 'LTU', CY: 'CYP', MT: 'MLT',
};

export interface LabelAddress {
  firstName: string;
  lastName: string;
  street: string;
  extra: string;
  zip: string;
  city: string;
  country: string; // alpha-2
}

const cut = (s: string, n: number) => s.trim().replace(/\s+/g, ' ').slice(0, n);

function shipper() {
  const [zip, ...city] = BUSINESS.zipCity.split(' ');
  return { name1: BUSINESS.name, name2: BUSINESS.owner, addressStreet: BUSINESS.street, postalCode: zip, city: city.join(' '), country: 'DEU' };
}

/** Doorstep address, or a German Packstation ("Packstation 123" + Postnummer in the extra line). */
export function consignee(a: LabelAddress) {
  const name = cut(`${a.firstName} ${a.lastName}`, 50);
  const country = ALPHA3[a.country];
  if (!country) throw new DhlError(`Land ${a.country} wird nicht unterstützt`);
  const locker = a.country === 'DE' ? /^\s*packstation\s*(?:nr\.?\s*)?(\d{3})\s*$/i.exec(a.street) : null;
  const postNumber = /\b(\d{6,10})\b/.exec(a.extra)?.[1];
  if (locker && postNumber) {
    return { name, lockerID: Number(locker[1]), postNumber, postalCode: a.zip.trim(), city: cut(a.city, 40), country };
  }
  return {
    name1: name,
    // Address extras (c/o, floor) go into name2: additionalAddressInformation is not printed on German labels.
    ...(a.extra.trim() ? { name2: cut(a.extra, 50) } : {}),
    addressStreet: cut(a.street, 50),
    postalCode: a.zip.trim(),
    city: cut(a.city, 40),
    country,
  };
}

function berlinDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(d);
}

export interface LabelResult {
  shipmentNo: string;
  pdf: Buffer | null;
  warnings: string[];
}

function messages(item: { validationMessages?: { property?: string; validationMessage?: string; validationState?: string }[] }) {
  return (item.validationMessages ?? []).map((m) => `${m.property ? m.property + ': ' : ''}${m.validationMessage ?? ''}`.trim()).filter(Boolean);
}

async function postOrder(cfg: Config, shipment: Record<string, unknown>, validate: boolean): Promise<LabelResult> {
  const qs = new URLSearchParams({ validate: String(validate), includeDocs: 'include', docFormat: 'PDF' });
  if (cfg.printFormat) qs.set('printFormat', cfg.printFormat);
  const res = await fetch(`${cfg.base}/orders?${qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token(cfg)}`, 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Language': 'de-DE' },
    body: JSON.stringify({ profile: PROFILE, shipments: [shipment] }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    status?: { title?: string; detail?: string };
    items?: { shipmentNo?: string; sstatus?: { status?: number; title?: string; detail?: string }; label?: { b64?: string }; validationMessages?: { property?: string; validationMessage?: string; validationState?: string }[] }[];
  };
  const item = body.items?.[0];
  const ok = res.ok && item && (item.sstatus?.status ?? 200) < 300;
  if (!ok) {
    const why = [item?.sstatus?.detail || item?.sstatus?.title || body.status?.detail || body.status?.title, ...(item ? messages(item) : [])].filter(Boolean).join(' · ');
    throw new DhlError(`DHL ${res.status}: ${why || 'Fehler'}`.slice(0, 500));
  }
  return { shipmentNo: item.shipmentNo ?? '', pdf: item.label?.b64 ? Buffer.from(item.label.b64, 'base64') : null, warnings: messages(item) };
}

function buildShipment(cfg: Config, refNo: string, address: LabelAddress, weightG: number) {
  const product: Product = address.country === 'DE' ? 'V01PAK' : 'V53WPAK';
  return {
    product,
    billingNumber: cfg.billing(product),
    refNo: refNo.padEnd(8, '-').slice(0, 35),
    shipDate: berlinDate(),
    shipper: shipper(),
    consignee: consignee(address),
    details: { weight: { uom: 'g', value: Math.min(31500, Math.max(100, Math.round(weightG))) } },
  };
}

/**
 * Connection test for the owner settings. Live: dry run (validate=true) against the business account,
 * nothing is booked. Without a business account: creates a test label in the DHL sandbox.
 */
export async function testDhl(): Promise<{ mode: Mode; shipmentNo: string; warnings: string[] }> {
  const mode: Mode = dhlLive() ? 'production' : 'sandbox';
  const cfg = config(mode);
  if (!cfg) throw new DhlError('DHL_API_KEY / DHL_API_SECRET fehlen');
  const [zip, ...city] = BUSINESS.zipCity.split(' ');
  const to: LabelAddress = { firstName: 'Test', lastName: 'Empfänger', street: BUSINESS.street, extra: '', zip, city: city.join(' '), country: 'DE' };
  const r = await postOrder(cfg, buildShipment(cfg, 'TIC-TEST-0000', to, 500), mode === 'production');
  return { mode, shipmentNo: r.shipmentNo, warnings: r.warnings };
}

/** Cancels a label that has not been handed over yet (before DHL's end-of-day closing). */
export async function cancelShipment(shipmentNo: string): Promise<void> {
  const cfg = config('production');
  if (!cfg || !dhlLive()) throw new DhlError('DHL ist nicht eingerichtet');
  const qs = new URLSearchParams({ profile: PROFILE, shipment: shipmentNo });
  const res = await fetch(`${cfg.base}/orders?${qs}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${await token(cfg)}`, Accept: 'application/json', 'Accept-Language': 'de-DE' },
  });
  const body = (await res.json().catch(() => ({}))) as { items?: { sstatus?: { status?: number; detail?: string; title?: string } }[]; status?: { detail?: string } };
  const st = body.items?.[0]?.sstatus;
  if (!res.ok || (st?.status ?? 200) >= 300) throw new DhlError(`DHL Storno fehlgeschlagen: ${st?.detail || st?.title || body.status?.detail || res.status}`);
}

type OrderRow = {
  id: string;
  order_no: string;
  first_name: string;
  last_name: string;
  street: string;
  extra: string;
  zip: string;
  city: string;
  country: string;
  carrier: string;
  tracking: string;
  label_path: string | null;
  label_error: string;
  flags: string[];
  payment_status: string;
  status: string;
  order_items: { product_id: string | null; qty: number }[];
};

export type LabelOutcome = { ok: true; shipmentNo: string } | { ok: false; skipped?: string; error?: string };

/**
 * Creates the DHL label for a paid order, stores the PDF in the private "shipping-labels" bucket and
 * writes the shipment number into orders.tracking. Safe to call more than once: orders that already
 * have a tracking number are skipped. `auto` = triggered by the payment webhook (pre-orders wait).
 */
export async function createLabelForOrder(admin: SupabaseClient, orderId: string, opts: { auto?: boolean } = {}): Promise<LabelOutcome> {
  if (!dhlLive()) return { ok: false, skipped: 'not_configured' };
  const cfg = config('production')!;
  const { data: o, error } = await admin.from('orders').select('*, order_items(product_id, qty)').eq('id', orderId).single();
  if (error) throw error;
  const order = o as OrderRow;
  if (order.payment_status !== 'paid') return { ok: false, skipped: 'not_paid' };
  if (order.tracking) return { ok: false, skipped: 'has_tracking' };
  if (order.carrier && order.carrier !== 'DHL') return { ok: false, skipped: 'other_carrier' };
  if (!['confirmed', 'processing'].includes(order.status)) return { ok: false, skipped: 'status' };
  if (opts.auto && order.flags.includes('preorder')) return { ok: false, skipped: 'preorder' };

  // Claim the order so a retried webhook and a click in the dashboard can't book two labels.
  const { data: claimed } = await admin
    .from('orders')
    .update({ label_error: 'creating', label_started_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('tracking', '')
    .or(`label_error.neq.creating,label_started_at.lt.${new Date(Date.now() - 5 * 60_000).toISOString()}`)
    .select('id');
  if (!claimed?.length) return { ok: false, skipped: 'in_progress' };

  try {
    const ids = order.order_items.map((i) => i.product_id).filter(Boolean) as string[];
    const { data: products } = ids.length ? await admin.from('products').select('id, weight_g').in('id', ids) : { data: [] };
    const weightOf = new Map((products ?? []).map((p) => [p.id as string, (p.weight_g as number | null) ?? DEFAULT_ITEM_G]));
    const weight = PACKAGING_G + order.order_items.reduce((g, i) => g + i.qty * (weightOf.get(i.product_id ?? '') ?? DEFAULT_ITEM_G), 0);

    const r = await postOrder(cfg, buildShipment(cfg, order.order_no, { firstName: order.first_name, lastName: order.last_name, street: order.street, extra: order.extra, zip: order.zip, city: order.city, country: order.country }, weight), false);
    let labelPath: string | null = null;
    if (r.pdf) {
      labelPath = `${order.order_no}-${r.shipmentNo}.pdf`;
      const { error: upErr } = await admin.storage.from(BUCKET).upload(labelPath, r.pdf, { contentType: 'application/pdf', upsert: true });
      if (upErr) {
        console.error('[dhl] label upload failed', upErr);
        labelPath = null;
      }
    }
    await admin
      .from('orders')
      .update({ carrier: 'DHL', tracking: r.shipmentNo, label_path: labelPath, label_error: r.warnings.length ? `Hinweis: ${r.warnings.join(' · ')}`.slice(0, 500) : '' })
      .eq('id', orderId);
    return { ok: true, shipmentNo: r.shipmentNo };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[dhl] label failed', order.order_no, msg);
    await admin.from('orders').update({ label_error: msg.slice(0, 500) }).eq('id', orderId);
    return { ok: false, error: msg };
  }
}

/** Cancels the label of an order (before end-of-day closing) and clears the tracking number. */
export async function cancelLabelForOrder(admin: SupabaseClient, orderId: string): Promise<void> {
  const { data: o, error } = await admin.from('orders').select('tracking, label_path, status').eq('id', orderId).single();
  if (error) throw error;
  if (!o.tracking) return;
  if (o.status === 'shipped' || o.status === 'delivered') throw new DhlError('Bereits versendet: Storno nicht mehr möglich');
  await cancelShipment(o.tracking as string);
  if (o.label_path) await admin.storage.from(BUCKET).remove([o.label_path as string]);
  await admin.from('orders').update({ tracking: '', label_path: null, label_error: '' }).eq('id', orderId);
}

export async function downloadLabel(admin: SupabaseClient, path: string): Promise<Buffer> {
  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) throw error ?? new Error('label not found');
  return Buffer.from(await data.arrayBuffer());
}
