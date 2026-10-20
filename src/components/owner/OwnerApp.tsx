'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OWNER } from '@/i18n/owner';
import type { Lang } from '@/lib/types';
import { TABS, type OwnerData, type Tab } from '@/lib/owner/types';
import { restockSuggestions, toShip } from '@/lib/owner/derive';
import { useTasks } from './useTasks';
import { Ctx, type OwnerCtx, type UiState } from './OwnerContext';
import { sx } from './sx';
import { Palette } from './Palette';
import { OrderDrawer } from './OrderDrawer';
import { PackingList } from './PackingList';
import { EditModal } from './EditModal';
import { TodayTab } from './tabs/TodayTab';
import { OrdersTab } from './tabs/OrdersTab';
import { ProductsTab } from './tabs/ProductsTab';
import { InsightsTab } from './tabs/InsightsTab';
import { PromoTab } from './tabs/PromoTab';
import { SettingsTab } from './tabs/SettingsTab';

const LANG_COOKIE = 'tic-owner-lang';

function countdown(target: number, now: number, t: (typeof OWNER)['en']) {
  const diff = target - now;
  if (diff <= 0) return { long: t.liveNow, short: t.live };
  const d = Math.floor(diff / 864e5);
  const h = Math.floor((diff % 864e5) / 36e5);
  const m = Math.floor((diff % 36e5) / 6e4);
  return { long: `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`, short: `${d}d ${h}h` };
}

export function OwnerApp({ data, initialLang }: { data: OwnerData; initialLang: Lang }) {
  const router = useRouter();
  const pathname = usePathname();
  const seg = pathname.split('/')[2] as Tab;
  const tab: Tab = TABS.includes(seg) ? seg : 'today';
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = OWNER[lang];
  const [now, setNow] = useState(() => new Date(data.now));
  const [toastMsg, setToastMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [ui, setUiState] = useState<UiState>({
    search: '',
    view: 'board',
    lf: 'all',
    orderId: null,
    modal: null,
    modalErr: '',
    packing: false,
    palette: false,
    aRange: 30,
  });

  const setUi = useCallback((patch: Partial<UiState> | ((s: UiState) => Partial<UiState>)) => {
    setUiState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);

  // Countdown ticks every 30 s (as in the design).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setUi({ palette: true });
      } else if (e.key === 'Escape') {
        setUi((s) => (s.palette ? { palette: false } : s.modal ? { modal: null } : s.packing ? { packing: false } : s.orderId ? { orderId: null } : {}));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setUi]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2800);
  }, []);

  const go = useCallback(
    (next: Tab, extra?: Partial<UiState>) => {
      setUi({ orderId: null, ...(extra ?? {}) });
      if (next !== tab) router.push('/owner/' + next, { scroll: false });
      window.scrollTo(0, 0);
    },
    [router, setUi, tab],
  );

  const run = useCallback<OwnerCtx['run']>(
    async (fn, ok) => {
      setBusy(true);
      try {
        const r = await fn();
        if (r.ok) {
          const msg = typeof ok === 'function' ? ok(r) : ok;
          toast(r.emailOff && r.emailed === 0 ? `${msg} — ${t.toast.emailOff}` : msg);
          return true;
        }
        toast(t.toast.failed);
        return false;
      } catch (e) {
        console.error(e);
        toast(t.toast.failed);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [t, toast],
  );

  const fmt = useMemo(() => {
    const loc = lang === 'de' ? 'de-DE' : 'de-DE'; // Prices always in German format, as in the design.
    const e2 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR' });
    const e0 = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    return { eur: (c: number) => e2.format(c / 100), eur0: (c: number) => e0.format(c / 100) };
  }, [lang]);

  const ctx: OwnerCtx = { data, t, lang, now, tab, go, ui, setUi, toast, run, busy, ...fmt };

  // Badges
  const tasks = useTasks(ctx);
  const shipCount = data.orders.filter(toShip).length;
  const restockNow = restockSuggestions(data.products, data.orders, now).filter((r) => r.now && !r.product.restockOrdered).length;
  const badge: Partial<Record<Tab, [number, string, string]>> = {
    today: [tasks.length, 'rgba(255,255,255,.1)', '#ECEEF1'],
    orders: [shipCount, 'rgba(124,156,255,.2)', '#A9BCFF'],
    products: [restockNow, 'rgba(255,107,94,.18)', '#FF6B5E'],
  };

  const drop = data.drops[0];
  const cd = drop ? countdown(new Date(drop.liveAt).getTime(), now.getTime(), t) : null;

  return (
    <Ctx.Provider value={ctx}>
      <div style={sx('min-height:100vh;background:#14161A;display:flex;flex-direction:column')}>
        <header className="o-header" style={sx('position:sticky;top:0;z-index:20;background:#14161A;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:20px;padding:0 28px;height:64px')}>
          <div style={sx('display:flex;align-items:center;gap:10px;flex-shrink:0')}>
            <span style={sx('width:30px;height:30px;border-radius:8px;background:#ECEEF1;color:#14161A;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px')} aria-label="TIC Originals">
              TIC
            </span>
          </div>
          <nav className="o-nav" style={sx('display:flex;gap:2px;flex-shrink:0')} aria-label="Dashboard">
            {TABS.map((key) => {
              const active = key === tab;
              const b = badge[key];
              return (
                <button
                  key={key}
                  onClick={() => go(key)}
                  className={active ? '' : 'o-hov-text'}
                  aria-current={active ? 'page' : undefined}
                  style={{ ...sx('height:36px;padding:0 14px;border:0;border-radius:18px;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:8px'), background: active ? '#ECEEF1' : 'transparent', color: active ? '#14161A' : '#9AA1AC' }}
                >
                  {t.tabs[key]}
                  {b && b[0] > 0 && (
                    <span style={{ ...sx('min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center'), background: active ? '#14161A' : b[1], color: active ? '#ECEEF1' : b[2] }}>
                      {b[0]}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div style={sx('display:flex;align-items:center;gap:8px;height:38px;padding:0 12px;border-radius:10px;background:#1C1F25;flex:1 1 160px;min-width:0;max-width:280px;margin-left:auto;box-sizing:border-box;color:#6B727D')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3" />
            </svg>
            <input
              value={ui.search}
              aria-label={t.searchPh}
              onChange={(e) => {
                const v = e.target.value;
                setUi({ search: v, ...(v ? { view: 'list', lf: 'all', orderId: null } : {}) });
                if (v && tab !== 'orders') router.push('/owner/orders', { scroll: false });
              }}
              placeholder={t.searchPh}
              style={sx('flex:1;min-width:0;border:0;background:transparent;color:#ECEEF1;font-size:13px;outline:none')}
            />
            <button onClick={() => setUi({ palette: true })} title={t.quickJump} aria-label={t.quickJump} style={sx("border:0;background:#22262D;color:#9AA1AC;font-family:'DM Mono',monospace;font-size:11px;padding:2px 6px;border-radius:5px;cursor:pointer;flex-shrink:0")}>
              ⌘K
            </button>
          </div>
          {/* DE/EN switch (not in the design; requested for the dashboard UI). */}
          <button
            onClick={() => {
              const next = lang === 'en' ? 'de' : 'en';
              setLang(next);
              document.cookie = `${LANG_COOKIE}=${next}; path=/owner; max-age=31536000; samesite=lax`;
            }}
            aria-label={lang === 'en' ? 'Auf Deutsch umschalten' : 'Switch to English'}
            className="o-hov-text"
            style={sx('height:38px;padding:0 6px;border:0;background:transparent;color:#9AA1AC;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0')}
          >
            <span style={{ color: lang === 'de' ? '#ECEEF1' : undefined }}>DE</span> / <span style={{ color: lang === 'en' ? '#ECEEF1' : undefined }}>EN</span>
          </button>
          <button onClick={() => go('promo')} style={sx('height:38px;padding:0 14px;border:0;border-radius:10px;background:rgba(124,156,255,.12);color:#A9BCFF;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:8px;flex-shrink:0')}>
            <span style={sx('width:7px;height:7px;border-radius:50%;background:#FF6B5E')} />
            {cd ? cd.short : t.noDrop}
          </button>
        </header>

        <div className="o-content" style={sx('flex:1;padding:32px 28px 64px;display:flex;flex-direction:column;gap:20px;max-width:1240px;width:100%;box-sizing:border-box;margin:0 auto')}>
          {tab === 'today' && <TodayTab tasks={tasks} />}
          {tab === 'orders' && <OrdersTab />}
          {tab === 'products' && <ProductsTab />}
          {tab === 'insights' && <InsightsTab />}
          {tab === 'promo' && <PromoTab countdown={cd?.long ?? t.noDrop} />}
          {tab === 'settings' && <SettingsTab />}
        </div>
      </div>

      {ui.orderId && <OrderDrawer />}
      {ui.packing && <PackingList />}
      {ui.modal && <EditModal />}
      {ui.palette && <Palette tasksCount={tasks.length} />}
      {toastMsg && (
        <div role="status" style={sx('position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:70;background:#ECEEF1;color:#14161A;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 12px 40px rgba(0,0,0,.4);max-width:calc(100% - 32px)')}>
          {toastMsg}
        </div>
      )}
    </Ctx.Provider>
  );
}
