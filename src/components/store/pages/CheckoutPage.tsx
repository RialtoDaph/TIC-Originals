'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadStripe, type Appearance, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useStore } from '../StoreProvider';
import { CheckoutHeader } from '../Headers';
import { CheckoutFooter } from '../Footers';
import { COUNTRIES } from '@/lib/countries';
import { computeTotals, discountCents, type Totals } from '@/lib/pricing';
import { addressErrors, type AddressInput } from '@/lib/validation';
import { img } from '@/lib/images';
import { CLAIMED_CODE_KEY } from '@/lib/constants';
import s from './Checkout.module.css';

export interface CheckoutPrefill {
  email: string;
  first: string;
  last: string;
  street: string;
  extra: string;
  zip: string;
  city: string;
  country: string;
  phone: string;
}

interface AppliedCode {
  code: string;
  isPercent: boolean;
  value: number;
}

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

const appearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#111111',
    colorText: '#111111',
    colorTextSecondary: '#555555',
    colorDanger: '#C2183B',
    fontFamily: 'Archivo, sans-serif',
    fontSizeBase: '14px',
    borderRadius: '0px',
  },
  rules: {
    '.AccordionItem': { border: '1px solid #CFCFCF', boxShadow: 'none', padding: '18px 20px' },
    '.AccordionItem--selected': { border: '2px solid #111111' },
    '.Input': { border: '1px solid #CFCFCF', boxShadow: 'none', padding: '15px 14px', fontSize: '16px' },
    '.Input:focus': { outline: '2px solid #9EF2FF', boxShadow: 'none', borderColor: '#CFCFCF' },
    '.Input--invalid': { borderColor: '#C2183B', boxShadow: 'none' },
    '.Label': { fontSize: '12px', color: '#555555' },
  },
};

type FieldKey = keyof AddressInput;

function Field({
  k,
  label,
  type = 'text',
  ac,
  span = 2,
  value,
  onChange,
  err,
  errText,
}: {
  k: FieldKey;
  label: string;
  type?: string;
  ac: string;
  span?: 1 | 2;
  value: string;
  onChange: (v: string) => void;
  err: boolean;
  errText: string;
}) {
  const id = 'f-' + k;
  return (
    <label className={`${s.field} ${span === 2 ? s.span2 : s.span1}`} htmlFor={id}>
      <span className={s.label}>{label}</span>
      <input
        id={id}
        type={type}
        autoComplete={ac}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={err}
        aria-describedby={err ? id + '-err' : undefined}
        className={`${s.input} ${err ? s.inputErr : ''}`}
      />
      {err && (
        <span id={id + '-err'} className={s.fieldErr}>
          {errText}
        </span>
      )}
    </label>
  );
}

export function CheckoutPage({ prefill }: { prefill: CheckoutPrefill }) {
  const { t, lang, cart, cartLoaded, settings } = useStore();
  const [country, setCountry] = useState(prefill.country || 'DE');
  const [code, setCode] = useState<AppliedCode | null>(null);
  const [serverTotals, setServerTotals] = useState<Totals | null>(null);

  const subtotalCents = Math.round(cart.reduce((a, c) => a + c.eur * c.qty, 0) * 100);
  const totals =
    serverTotals ??
    computeTotals({ subtotalCents, discountCents: code ? discountCents(code, subtotalCents) : 0, country, settings });

  // Any cart, code or country change invalidates totals returned by the server.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset derived server state when inputs change
    setServerTotals(null);
  }, [subtotalCents, code, country]);

  const stripeP = getStripe();
  const options = useMemo(
    () => ({
      mode: 'payment' as const,
      amount: Math.max(totals.totalCents, 50),
      currency: 'eur',
      appearance,
      locale: lang,
      fonts:
        typeof window !== 'undefined'
          ? [{ family: 'Archivo', src: `url(${window.location.origin}/fonts/archivo-latin.woff2)`, weight: '300 700' }]
          : [],
    }),
    [totals.totalCents, lang],
  );

  if (cartLoaded && cart.length === 0) {
    return (
      <div className={s.page}>
        <CheckoutHeader />
        <main className={s.empty}>
          <h1 className={s.emptyH}>{t.emptyH}</h1>
          <p className={s.emptyP}>{t.emptyP}</p>
          <Link href="/shop" className={s.cyanBtn}>
            {t.toShop}
          </Link>
        </main>
        <CheckoutFooter />
      </div>
    );
  }

  const form = (
    <CheckoutForm
      prefill={prefill}
      country={country}
      setCountry={setCountry}
      code={code}
      setCode={setCode}
      totals={totals}
      setServerTotals={setServerTotals}
      stripeReady={!!stripeP}
    />
  );

  return (
    <div className={s.page}>
      <CheckoutHeader />
      {/* With no publishable key, stripe is null: the form renders and shows an error in section 04. */}
      <Elements stripe={stripeP} options={options}>
        {form}
      </Elements>
      <CheckoutFooter />
    </div>
  );
}

function CheckoutForm({
  prefill,
  country,
  setCountry,
  code,
  setCode,
  totals,
  setServerTotals,
  stripeReady,
}: {
  prefill: CheckoutPrefill;
  country: string;
  setCountry: (c: string) => void;
  code: AppliedCode | null;
  setCode: (c: AppliedCode | null) => void;
  totals: Totals;
  setServerTotals: (t: Totals | null) => void;
  stripeReady: boolean;
}) {
  const { t, lang, cart, setQty, productById, money, amount, clearCart, settings } = useStore();
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [f, setF] = useState({ ...prefill, country: undefined } as Omit<CheckoutPrefill, 'country'> & { country?: string });
  const [news, setNews] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [payReady, setPayReady] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeMsg, setCodeMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const checkoutId = useRef<string | null>(null);

  const addr: AddressInput = { ...f, country } as AddressInput;
  const errs = addressErrors(addr);
  const hasErrors = tried && Object.keys(errs).length > 0;
  const items = cart.map((c) => ({ id: c.id, size: c.size, qty: c.qty }));

  async function applyCode(raw: string, silent = false) {
    const c = raw.trim().toUpperCase();
    if (!c) return;
    try {
      const res = await fetch('/api/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c, email: f.email, items, country }),
      });
      const r = await res.json();
      if (r.ok) {
        setCode({ code: r.code, isPercent: r.isPercent, value: r.value });
        setCodeMsg({ ok: true, text: t.codeOk(r.code, r.isPercent ? (lang === 'de' ? `${r.value} %` : `${r.value}%`) : money(r.value)) });
      } else {
        setCode(null);
        if (!silent) {
          const p = r.problem;
          setCodeMsg({
            ok: false,
            text: p === 'min' ? t.codeProblem.min(amount(r.minCents)) : p === 'first' ? t.codeProblem.first : p === 'expired' ? t.codeProblem.expired : t.codeBad,
          });
        } else setCodeMsg(null);
      }
    } catch {
      setCodeMsg({ ok: false, text: t.genericError });
    }
  }

  // Apply the code claimed in the Home popup ("wird an der Kasse angewendet").
  const claimedApplied = useRef(false);
  useEffect(() => {
    if (claimedApplied.current || !cart.length) return;
    claimedApplied.current = true;
    let claimed: string | null = null;
    try {
      claimed = localStorage.getItem(CLAIMED_CODE_KEY);
    } catch {}
    if (claimed) {
      setCodeInput(claimed);
      void applyCode(claimed, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length]);

  async function submit() {
    setFormError('');
    if (Object.keys(errs).length) {
      setTried(true);
      return;
    }
    if (!stripe || !elements) {
      setFormError(t.genericError);
      return;
    }
    setBusy(true);
    try {
      const { error: submitErr } = await elements.submit();
      if (submitErr) {
        setBusy(false);
        return; // The Payment Element shows the field error itself.
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addr, lang, newsletter: news, items, code: code?.code ?? null, expectedTotalCents: totals.totalCents, checkoutId: checkoutId.current }),
      });
      const r = await res.json().catch(() => ({ error: 'server' }));
      if (!res.ok) {
        if (r.error === 'changed') {
          setServerTotals(r.totals);
          setFormError(t.pricesChanged);
        } else if (r.error === 'stock') setFormError(r.name ? t.outOfStock(r.name, r.size) : t.pricesChanged);
        else if (r.error === 'code') {
          setCode(null);
          setFormError(t.pricesChanged);
        } else if (r.error === 'locked') location.reload();
        else setFormError(t.genericError);
        setBusy(false);
        return;
      }
      checkoutId.current = r.checkoutId;
      const name = `${addr.first} ${addr.last}`;
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: r.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
          payment_method_data: {
            billing_details: {
              name,
              email: addr.email,
              phone: addr.phone || '',
              address: { line1: addr.street, line2: addr.extra || '', postal_code: addr.zip, city: addr.city, country: addr.country, state: '' },
            },
          },
        },
        redirect: 'if_required',
      });
      if (error) {
        setFormError(error.type === 'card_error' || error.type === 'validation_error' ? error.message ?? t.payFailed : t.payFailed);
        setBusy(false);
        return;
      }
      try {
        localStorage.removeItem(CLAIMED_CODE_KEY);
      } catch {}
      clearCart();
      router.push(`/checkout/success?payment_intent=${paymentIntent?.id ?? ''}`);
    } catch (e) {
      console.error(e);
      setFormError(t.genericError);
      setBusy(false);
    }
  }

  const field = (k: FieldKey, label: string, type: string, ac: string, span: 1 | 2 = 2) => (
    <Field
      key={k}
      k={k}
      label={label}
      type={type}
      ac={ac}
      span={span}
      value={(f as Record<string, string>)[k] ?? ''}
      onChange={(v) => setF((p) => ({ ...p, [k]: v }))}
      err={tried && !!errs[k]}
      errText={tried && errs[k] ? t[errs[k]!] : ''}
    />
  );

  const shipLabel = totals.shippingCents === 0 ? t.free : money(totals.shippingCents / 100);
  const total = money(totals.totalCents / 100);
  const count = cart.reduce((a, c) => a + c.qty, 0);

  return (
    <main className={s.main}>
      <form
        className={s.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h1 className={s.h1}>{t.title}</h1>

        <section className={s.section}>
          <div className={s.sectionHead}>
            <span className={s.sectionH}>01 · {t.contact}</span>
            <Link href="/account" className={s.ul13}>
              {t.haveAcc}
            </Link>
          </div>
          {field('email', t.email, 'email', 'email')}
          <label className={s.check}>
            <input type="checkbox" checked={news} onChange={() => setNews((n) => !n)} className={s.checkbox} />
            {t.news}
          </label>
        </section>

        <section className={s.section}>
          <span className={s.sectionH}>02 · {t.address}</span>
          <label className={s.field} htmlFor="f-country">
            <span className={s.label}>{t.country}</span>
            <select id="f-country" className={s.select} value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country">
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c[lang]}
                </option>
              ))}
            </select>
          </label>
          <div className={s.grid2}>
            {field('first', t.first, 'text', 'given-name', 1)}
            {field('last', t.last, 'text', 'family-name', 1)}
            {field('street', t.street, 'text', 'address-line1')}
            {field('extra', t.extra, 'text', 'address-line2')}
            {field('zip', t.zip, 'text', 'postal-code', 1)}
            {field('city', t.city, 'text', 'address-level2', 1)}
            {field('phone', t.phone, 'tel', 'tel')}
          </div>
        </section>

        <section className={s.section}>
          <span className={s.sectionH}>03 · {t.shipping}</span>
          <div className={s.shipBox}>
            <div className={s.shipText}>
              <span className={s.shipName}>{country === 'DE' ? t.shipDE : t.shipINT}</span>
              <span className={s.shipEta}>{country === 'DE' ? t.etaDE : t.etaINT}</span>
            </div>
            <span className={s.shipPrice}>{shipLabel}</span>
          </div>
        </section>

        <section className={s.section}>
          <span className={s.sectionH}>04 · {t.payment}</span>
          {stripeReady ? (
            <>
              {!payReady && (
                <div className={s.payLoading} role="status">
                  <span className={s.spinner} />
                  {t.paymentLoading}
                </div>
              )}
              <PaymentElement
                onReady={() => setPayReady(true)}
                onLoadError={() => setFormError(t.genericError)}
                options={{
                  layout: { type: 'accordion', defaultCollapsed: false, radios: 'always', spacedAccordionItems: true },
                  fields: { billingDetails: { name: 'never', email: 'never', phone: 'never', address: 'never' } },
                }}
              />
            </>
          ) : (
            <div className={s.payLoading} role="alert">
              {t.genericError}
            </div>
          )}
          <span className={s.note}>{t.redirect}</span>
        </section>

        <section className={s.legal}>
          <p className={s.legalP}>
            {t.legal1}{' '}
            <Link href="/policies/agb" className={s.ul}>
              {t.agb}
            </Link>
            {t.legal2}{' '}
            <Link href="/policies/widerruf" className={s.ul}>
              {t.widerruf}
            </Link>{' '}
            {t.legal3}{' '}
            <Link href="/policies/datenschutz" className={s.ul}>
              {t.privacy}
            </Link>
            .
          </p>
          {hasErrors && (
            <span className={s.formErr} role="alert">
              {t.fixErrors}
            </span>
          )}
          {formError && (
            <span className={s.formErr} role="alert">
              {formError}
            </span>
          )}
          {/* German "Button-Lösung" (§ 312j Abs. 3 BGB): this is the final, payment-confirming click. */}
          <button type="submit" className={s.order} disabled={busy} aria-busy={busy}>
            {busy && <span className={s.spinner} />}
            {busy ? t.paying : `${t.order} · ${total}`}
          </button>
        </section>
      </form>

      <aside className={s.aside}>
        <div className={s.asideInner}>
          <span className={s.sectionH}>
            {t.summary} ({count})
          </span>
          <div className={s.items}>
            {cart.map((c, i) => (
              <div key={c.id + c.size} className={s.item}>
                <div className={s.thumbBox}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(productById(c.id)?.images[0])} alt="" className={s.thumb} />
                </div>
                <div className={s.itemInfo}>
                  <span className={s.itemName}>{c.name}</span>
                  <span className={s.itemMeta}>{c.size}</span>
                  <div className={s.qtyRow}>
                    <div className={s.stepper}>
                      <button type="button" className={s.stepBtn} onClick={() => setQty(i, -1)} aria-label="−1" disabled={busy}>
                        −
                      </button>
                      <span className={s.qty}>{c.qty}</span>
                      <button type="button" className={s.stepBtn} onClick={() => setQty(i, 1)} aria-label="+1" disabled={busy}>
                        +
                      </button>
                    </div>
                    <button type="button" className={s.remove} onClick={() => setQty(i, -c.qty)} disabled={busy}>
                      {t.remove}
                    </button>
                  </div>
                </div>
                <span className={s.itemPrice}>{money(c.eur * c.qty)}</span>
              </div>
            ))}
          </div>
          <div className={s.codeWrap}>
            <div className={s.codeRow}>
              <input
                placeholder={t.codePh}
                aria-label={t.codePh}
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  setCodeMsg(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void applyCode(codeInput);
                  }
                }}
                className={s.codeInput}
              />
              <button type="button" className={s.apply} onClick={() => void applyCode(codeInput)}>
                {t.apply}
              </button>
            </div>
            {codeMsg && (
              <span className={s.codeMsg} style={{ color: codeMsg.ok ? '#1F7A4D' : '#C2183B' }} role="status">
                {codeMsg.text}
              </span>
            )}
          </div>
          <div className={s.sums}>
            <div className={s.sumRow}>
              <span>{t.subtotal}</span>
              <span>{money(totals.subtotalCents / 100)}</span>
            </div>
            {totals.discountCents > 0 && (
              <div className={s.sumRow}>
                <span>
                  {t.discount} ({code?.code})
                </span>
                <span>−{money(totals.discountCents / 100)}</span>
              </div>
            )}
            <div className={s.sumRow}>
              <span>{t.shipping}</span>
              <span>{shipLabel}</span>
            </div>
            <span className={s.shipHint}>{totals.freeLeftCents === 0 ? t.freeOk(amount(settings.freeShipCents)) : t.freeLeft(money(totals.freeLeftCents / 100))}</span>
          </div>
          <div className={s.totalRow}>
            <div className={s.totalLeft}>
              <span className={s.totalH}>{t.total}</span>
              <span className={s.vat}>{t.vatLine}</span>
            </div>
            <span className={s.total}>{total}</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
