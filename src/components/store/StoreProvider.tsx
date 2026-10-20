'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartLine, Drop, Lang, Product, SiteSettings } from '@/lib/types';
import { STORE, type StoreDict } from '@/i18n/storefront';
import { fmtAmount, fmtMoney } from '@/lib/format';
import { usdPrice } from '@/lib/pricing';

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

/** Keep cart lines in sync with the live catalogue: current names/prices, drop removed products. */
function reprice(cart: CartLine[], products: Product[]): CartLine[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return cart
    .filter((c) => byId.has(c.id) && c.qty > 0)
    .map((c) => {
      const p = byId.get(c.id)!;
      return { ...c, name: p.name, eur: p.priceCents / 100, color: p.color };
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
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart, cartLoaded]);

  // Other tabs (or the checkout success page) may change the cart.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setCart(reprice(readCart(), products));
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
