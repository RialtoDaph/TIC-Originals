'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CartLine, Drop, Lang, Product, SiteSettings } from '@/lib/types';
import { STORE, type StoreDict } from '@/i18n/storefront';
import { fmtAmount, fmtMoney } from '@/lib/format';
import { usdPrice } from '@/lib/pricing';
import { CATEGORIES } from '@/lib/categories';

const CART_KEY = 'tic-cart-v3';
const CONSENT_KEY = 'tic-consent';
const LANG_COOKIE = 'tic-lang';

interface StoreCtx {
  lang: Lang;
  t: StoreDict;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  settings: SiteSettings;
  products: Product[];
  /** Categories that currently have at least one visible product (navigation, filters). */
  categories: { slug: string; label: string }[];
  productById: (id: string) => Product | undefined;
  drop: Drop | null;
  // Cart
  cart: CartLine[];
  cartLoaded: boolean;
  cartCount: number;
  subtotalEur: number;
  addToCart: (p: Product, size: string) => void;
  setQty: (index: number, delta: number) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  // Display currency (Home header switcher; checkout always charges EUR)
  currency: 'EUR' | 'USD';
  setCurrency: (c: 'EUR' | 'USD') => void;
  price: (eur: number) => string;
  money: (eur: number) => string;
  amount: (cents: number) => string;
  // Consent
  consent: string | null;
  consentChecked: boolean;
  setConsent: (v: 'all' | 'necessary') => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore outside StoreProvider');
  return c;
}

function readCart(): CartLine[] {
  try {
    const c = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(c) ? c : [];
  } catch {
    return [];
  }
}

/**
 * Keep cart lines in sync with the live catalogue: current names/prices, drop removed products.
 * With keepUnknown, lines for products this page doesn't know are kept as they are: a tab opened
 * before new products were added must not delete them from the cart shared with other tabs.
 */
function reprice(cart: CartLine[], products: Product[], keepUnknown = false): CartLine[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return cart
    .filter((c) => c.qty > 0 && (keepUnknown || byId.has(c.id)))
    .map((c) => {
      const p = byId.get(c.id);
      return p ? { ...c, name: p.name, eur: p.priceCents / 100, color: p.color } : c;
    });
}

export function StoreProvider({
  children,
  initialLang,
  settings,
  products,
  drop,
}: {
  children: React.ReactNode;
  initialLang: Lang;
  settings: SiteSettings;
  products: Product[];
  drop: Drop | null;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [consent, setConsentState] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  // Set when the cart was just copied from another tab: that change must not be written back.
  const fromOtherTab = useRef(false);

  // Load persisted state after hydration (localStorage is browser-only).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    setCart(reprice(readCart(), products));
    setCartLoaded(true);
    let ck: string | null = null;
    try {
      ck = localStorage.getItem(CONSENT_KEY);
    } catch {}
    setConsentState(ck);
    setConsentChecked(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [products]);

  useEffect(() => {
    if (!cartLoaded) return;
    if (fromOtherTab.current) {
      fromOtherTab.current = false;
      return;
    }
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart, cartLoaded]);

  // Other tabs (or the checkout success page) may change the cart.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CART_KEY) return;
      fromOtherTab.current = true;
      setCart(reprice(readCart(), products, true));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [products]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
  }, []);
  const toggleLang = useCallback(() => setLang(lang === 'de' ? 'en' : 'de'), [lang, setLang]);

  const productById = useCallback((id: string) => products.find((p) => p.id === id), [products]);

  const addToCart = useCallback((p: Product, size: string) => {
    const stock = p.variants.find((v) => v.size === size)?.stock ?? 0;
    setCart((prev) => {
      const next = [...prev];
      const i = next.findIndex((c) => c.id === p.id && c.size === size);
      if (i >= 0) next[i] = { ...next[i], qty: Math.min(next[i].qty + 1, Math.max(stock, 1)) };
      else next.push({ id: p.id, name: p.name, eur: p.priceCents / 100, color: p.color, size, qty: 1 });
      return next;
    });
  }, []);

  const setQty = useCallback(
    (index: number, delta: number) => {
      setCart((prev) =>
        prev
          .map((c, j) => {
            if (j !== index) return c;
            const stock = products.find((p) => p.id === c.id)?.variants.find((v) => v.size === c.size)?.stock;
            const qty = c.qty + delta;
            return { ...c, qty: delta > 0 && stock !== undefined ? Math.min(qty, Math.max(stock, c.qty)) : qty };
          })
          .filter((c) => c.qty > 0),
      );
    },
    [products],
  );

  const clearCart = useCallback(() => setCart([]), []);

  const setConsent = useCallback((v: 'all' | 'necessary') => {
    try {
      localStorage.setItem(CONSENT_KEY, v);
    } catch {}
    setConsentState(v);
  }, []);

  const value = useMemo<StoreCtx>(() => {
    const money = (eur: number) => fmtMoney(eur, lang);
    return {
      lang,
      t: STORE[lang],
      setLang,
      toggleLang,
      settings,
      products,
      categories: CATEGORIES.filter((c) => products.some((p) => p.visible && p.category === c.slug)),
      productById,
      drop,
      cart,
      cartLoaded,
      cartCount: cart.reduce((a, c) => a + c.qty, 0),
      subtotalEur: cart.reduce((a, c) => a + c.eur * c.qty, 0),
      addToCart,
      setQty,
      clearCart,
      cartOpen,
      setCartOpen,
      currency,
      setCurrency,
      price: (eur: number) => (currency === 'USD' ? fmtMoney(usdPrice(eur, settings.usdRate), lang, 'USD') : money(eur)),
      money,
      amount: (cents: number) => fmtAmount(cents, lang),
      consent,
      consentChecked,
      setConsent,
    };
  }, [lang, setLang, toggleLang, settings, products, productById, drop, cart, cartLoaded, addToCart, setQty, clearCart, cartOpen, currency, consent, consentChecked, setConsent]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
