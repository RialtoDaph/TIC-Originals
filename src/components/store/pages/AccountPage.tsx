'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '../StoreProvider';
import { StoreHeader } from '../Headers';
import { AccountFooter } from '../Footers';
import { GoogleIcon } from '../icons';
import { createClient } from '@/lib/supabase/client';
import { EMAIL_RE } from '@/lib/validation';
import { COUNTRIES, countryName } from '@/lib/countries';
import { fmtDate } from '@/lib/format';
import { SITE_IMAGES, img } from '@/lib/images';
import { STORE_STATUS_BG } from '@/lib/tokens';
import { deleteAccount, makeDefaultAddress, saveAddress, type AddressForm } from '@/app/(store)/account/actions';
import s from './Account.module.css';

export interface AccountAddress extends AddressForm {
  id: string;
  isDefault: boolean;
}

export interface AccountData {
  email: string;
  first: string;
  last: string;
  isOwner: boolean;
  orders: { no: string; placedAt: string; totalCents: number; status: string; items: string }[];
  addresses: AccountAddress[];
}

type Mode = 'login' | 'register' | 'forgot' | 'otp';
type Err = 'req' | 'badEmail' | 'short' | 'mismatch' | 'badOtp';

export function AccountPage({ data }: { data: AccountData | null }) {
  return (
    <div className={s.page}>
      <StoreHeader variant="account" />
      {data ? <Dashboard data={data} /> : <AuthForm />}
      <AccountFooter />
    </div>
  );
}

function AuthForm() {
  const { t, lang } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setModeState] = useState<Mode>('login');
  const [f, setF] = useState({ email: '', pw: '', pw2: '', first: '', last: '', otp: '' });
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState(params.get('error') ? t.genericError : '');

  const setMode = (m: Mode) => {
    setModeState(m);
    setTried(false);
    setSent(false);
    setAuthError('');
  };

  const e: Partial<Record<keyof typeof f, Err>> = {};
  if (mode !== 'otp') {
    if (!f.email.trim()) e.email = 'req';
    else if (!EMAIL_RE.test(f.email.trim())) e.email = 'badEmail';
  }
  if (mode === 'login' || mode === 'register') {
    if (!f.pw) e.pw = 'req';
    else if (mode === 'register' && f.pw.length < 8) e.pw = 'short';
  }
  if (mode === 'register') {
    if (!f.first.trim()) e.first = 'req';
    if (!f.last.trim()) e.last = 'req';
    if (!f.pw2) e.pw2 = 'req';
    else if (f.pw2 !== f.pw) e.pw2 = 'mismatch';
  }
  if (mode === 'otp' && !/^\d{6}$/.test(f.otp.trim())) e.otp = 'badOtp';

  const fld = (k: keyof typeof f, label: string, type: string, ac: string, span: 1 | 2) => {
    const err = tried && e[k];
    const id = 'acc-' + k;
    return (
      <label key={k} className={s.field} style={{ gridColumn: `span ${span}` }} htmlFor={id}>
        <span className={s.label}>{label}</span>
        <input
          id={id}
          type={type}
          autoComplete={ac}
          value={f[k]}
          onChange={(ev) => setF((p) => ({ ...p, [k]: ev.target.value }))}
          aria-invalid={!!err}
          className={`${s.input} ${err ? s.inputErr : ''}`}
        />
        {err && <span className={s.err}>{t[err]}</span>}
      </label>
    );
  };

  const fields =
    mode === 'register'
      ? [fld('first', t.first, 'text', 'given-name', 1), fld('last', t.last, 'text', 'family-name', 1), fld('email', t.email, 'email', 'email', 2), fld('pw', t.pwNew, 'password', 'new-password', 2), fld('pw2', t.pw2, 'password', 'new-password', 2)]
      : mode === 'otp'
        ? [fld('otp', t.otp, 'text', 'one-time-code', 2)]
        : mode === 'forgot'
          ? [fld('email', t.email, 'email', 'email', 2)]
          : [fld('email', t.email, 'email', 'email', 2), fld('pw', t.pw, 'password', 'current-password', 2)];

  async function submit() {
    if (Object.keys(e).length) return setTried(true);
    const supabase = createClient();
    const email = f.email.trim();
    setBusy(true);
    setAuthError('');
    try {
      if (mode === 'forgot') {
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/account/reset-password` });
        setSent(true);
        setTried(false);
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password: f.pw,
          options: { data: { first_name: f.first.trim(), last_name: f.last.trim(), lang }, emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) setAuthError(error.message);
        else setMode('otp');
      } else if (mode === 'otp') {
        const { error } = await supabase.auth.verifyOtp({ email, token: f.otp.trim(), type: 'signup' });
        if (error) setAuthError(t.badOtp);
        else router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: f.pw });
        if (error) setAuthError(t.authFailed);
        else router.refresh();
      }
    } catch {
      setAuthError(t.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback` } });
    if (error) setAuthError(t.genericError);
  }

  const tabActive = (k: 'login' | 'register') => mode === k || (k === 'login' && mode === 'forgot') || (k === 'register' && mode === 'otp');
  const title = mode === 'otp' ? t.otpH : mode === 'register' ? t.registerH : mode === 'forgot' ? t.forgotH : t.loginH;
  const submitLabel = mode === 'otp' ? t.verify : mode === 'register' ? t.registerH : mode === 'forgot' ? t.send : t.login;

  return (
    <main className={s.authMain}>
      <div className={s.side}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(SITE_IMAGES.accountSide)} alt="" className={s.sideImg} />
        <div className={s.sideShade} />
        <div className={s.sideBody}>
          <span className={s.sideH}>{t.sideH}</span>
          <div className={s.perks}>
            {t.accPerks.map((p) => (
              <span key={p} className={s.perk}>
                <span className={s.perkDot} />
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className={s.formCol}>
        <form
          className={s.formInner}
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault();
            void submit();
          }}
        >
          <div className={s.tabs} role="tablist">
            {(
              [
                ['login', t.login],
                ['register', t.register],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tabActive(k)} className={`${s.tab} ${tabActive(k) ? s.tabActive : ''}`} onClick={() => setMode(k)}>
                {label}
              </button>
            ))}
          </div>
          <h1 className={s.h1}>{title}</h1>
          {mode === 'forgot' && <p className={s.p}>{t.forgotP}</p>}
          {(mode === 'login' || mode === 'register') && (
            <>
              <button type="button" className={s.google} onClick={() => void google()}>
                <GoogleIcon />
                {t.google}
              </button>
              <div className={s.or}>
                <span className={s.orLine} />
                {t.or}
                <span className={s.orLine} />
              </div>
            </>
          )}
          {mode === 'otp' && <p className={s.p}>{t.otpP(f.email.trim())}</p>}
          <div className={s.grid}>{fields}</div>
          {mode === 'login' && (
            <button type="button" className={s.linkBtn} onClick={() => setMode('forgot')}>
              {t.forgot}
            </button>
          )}
          {mode === 'register' && (
            <p className={s.small}>
              {t.regLegal}{' '}
              <Link href="/policies/datenschutz" className={s.ul}>
                {t.privacyPolicy}
              </Link>
              .
            </p>
          )}
          {sent && (
            <span className={s.ok} role="status">
              {t.sent}
            </span>
          )}
          {authError && (
            <span className={s.bad} role="alert">
              {authError}
            </span>
          )}
          <button type="submit" className={s.submit} disabled={busy} aria-busy={busy}>
            {busy ? t.loading : submitLabel}
          </button>
          {mode === 'forgot' && (
            <button type="button" className={s.linkBtn} onClick={() => setMode('login')}>
              ← {t.backLogin}
            </button>
          )}
          <div className={s.guest}>
            <span className={s.guestH}>{t.guestH}</span>
            <span className={s.guestP}>
              {t.guestP}{' '}
              <Link href="/policies/tracking" className={s.guestLink}>
                Track Order
              </Link>
            </span>
          </div>
        </form>
      </div>
    </main>
  );
}

const EMPTY_ADDR: AddressForm = { first_name: '', last_name: '', street: '', extra: '', zip: '', city: '', country: 'DE', phone: '' };

function AddressEditor({ initial, id, onDone }: { initial: AddressForm; id?: string; onDone: () => void }) {
  const { t, lang } = useStore();
  const [a, setA] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  const input = (k: keyof AddressForm, label: string, span: 1 | 2, ac: string) => (
    <label key={k} className={`${s.field} ${span === 2 ? s.span2 : ''}`}>
      <span className={s.label}>{label}</span>
      <input className={s.input} autoComplete={ac} value={a[k]} onChange={(e) => setA((p) => ({ ...p, [k]: e.target.value }))} />
    </label>
  );
  return (
    <form
      className={s.addrForm}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await saveAddress(a, id).catch(() => ({ ok: false }));
        setBusy(false);
        if (r.ok) onDone();
        else setBad(true);
      }}
    >
      {input('first_name', t.first, 1, 'given-name')}
      {input('last_name', t.last, 1, 'family-name')}
      {input('street', t.street, 2, 'address-line1')}
      {input('extra', t.extra, 2, 'address-line2')}
      {input('zip', t.zip, 1, 'postal-code')}
      {input('city', t.city, 1, 'address-level2')}
      <label className={`${s.field} ${s.span2}`}>
        <span className={s.label}>{t.country}</span>
        <select className={s.select} value={a.country} onChange={(e) => setA((p) => ({ ...p, country: e.target.value }))}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c[lang]}
            </option>
          ))}
        </select>
      </label>
      {input('phone', t.phone, 2, 'tel')}
      {bad && <span className={`${s.err} ${s.span2}`}>{t.fixErrors}</span>}
      <div className={s.addrFormBtns}>
        <button className={s.btnDark} disabled={busy}>
          {busy ? t.loading : t.save}
        </button>
        <button type="button" className={s.btnLight} onClick={onDone}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

function Dashboard({ data }: { data: AccountData }) {
  const { t, lang, money } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [pwMsg, setPwMsg] = useState('');
  const [delArmed, setDelArmed] = useState(false);
  const [delErr, setDelErr] = useState('');

  const name = `${data.first} ${data.last}`.trim();
  const addrText = (a: AddressForm) => [`${a.first_name} ${a.last_name}`, a.street, a.extra, `${a.zip} ${a.city}`, countryName(a.country, lang)].filter((x) => x.trim()).join('\n');

  return (
    <main className={s.dash}>
      <div className={s.dashHead}>
        <div className={s.dashHeadL}>
          <span className={s.eyebrow}>{t.myAcc}</span>
          <h1 className={s.hello}>{t.hi(data.first || data.email.split('@')[0])}</h1>
        </div>
        <button
          className={s.logout}
          onClick={async () => {
            await createClient().auth.signOut();
            router.refresh();
          }}
        >
          {t.logout}
        </button>
      </div>
      <div className={s.dtabs} role="tablist">
        {t.accTabs.map((label, i) => (
          <button key={label} role="tab" aria-selected={i === tab} className={`${s.dtab} ${i === tab ? s.dtabActive : ''}`} onClick={() => setTab(i)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className={s.orders}>
          {data.orders.map((o) => (
            <div key={o.no} className={s.orderRow}>
              <div className={s.orderNo}>
                <span className={s.mono}>{o.no}</span>
                <span className={s.date}>{fmtDate(o.placedAt, lang)}</span>
              </div>
              <span className={s.itemsTxt}>{o.items}</span>
              <span className={s.status} style={{ background: STORE_STATUS_BG[o.status] ?? '#E4E4E4' }}>
                {t.st[o.status] ?? o.status}
              </span>
              <div className={s.totalRow}>
                <span className={s.total}>{money(o.totalCents / 100)}</span>
                <Link href={`/policies/tracking?no=${encodeURIComponent(o.no)}`} className={s.track}>
                  {t.track}
                </Link>
              </div>
            </div>
          ))}
          {data.orders.length === 0 && <span className={s.emptyNote}>{t.noOrders}</span>}
        </div>
      )}

      {tab === 1 && (
        <div className={s.addrGrid}>
          {data.addresses.map((a) => (
            <div key={a.id} className={a.isDefault ? s.addrCard : s.addrCardPlain}>
              {a.isDefault && <span className={s.addrLabel}>{t.defaultAddr}</span>}
              {editing === a.id ? (
                <AddressEditor initial={a} id={a.id} onDone={() => setEditing(null)} />
              ) : (
                <>
                  <span className={s.addrText}>{addrText(a)}</span>
                  <div className={s.addrBtns}>
                    <button className={s.smallLink} onClick={() => setEditing(a.id)}>
                      {t.edit}
                    </button>
                    {!a.isDefault && (
                      <button className={s.smallLink} onClick={() => void makeDefaultAddress(a.id)}>
                        {t.makeDefault}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {editing === 'new' ? (
            <div className={s.addrCardPlain}>
              <AddressEditor initial={{ ...EMPTY_ADDR, first_name: data.first, last_name: data.last }} onDone={() => setEditing(null)} />
            </div>
          ) : (
            <button className={s.addAddr} onClick={() => setEditing('new')}>
              + {t.addAddr}
            </button>
          )}
        </div>
      )}

      {tab === 2 && (
        <div className={s.data}>
          <div className={s.dataRow}>
            <span className={s.dataK}>{t.name}</span>
            <span className={s.dataV}>{name || '—'}</span>
          </div>
          <div className={s.dataRow}>
            <span className={s.dataK}>{t.email}</span>
            <span className={s.dataV}>{data.email}</span>
          </div>
          <div className={s.dataBtns}>
            <button
              className={s.dataBtn}
              onClick={async () => {
                await createClient().auth.resetPasswordForEmail(data.email, { redirectTo: `${location.origin}/auth/callback?next=/account/reset-password` });
                setPwMsg(t.resetSent);
              }}
            >
              {t.changePw}
            </button>
            {!data.isOwner && (
              <button
                className={s.dataBtnDanger}
                onClick={async () => {
                  if (!delArmed) return setDelArmed(true);
                  const r = await deleteAccount().catch(() => ({ ok: false }));
                  if (r.ok) {
                    await createClient().auth.signOut();
                    router.push('/');
                    router.refresh();
                  } else setDelErr(t.genericError);
                }}
              >
                {delArmed ? t.confirmDelete : t.deleteAcc}
              </button>
            )}
            {pwMsg && (
              <span className={s.ok} role="status">
                {pwMsg}
              </span>
            )}
            {delErr && (
              <span className={s.bad} role="alert">
                {delErr}
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
