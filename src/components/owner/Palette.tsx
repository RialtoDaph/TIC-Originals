'use client';

import { useEffect, useRef, useState } from 'react';
import { customerName, customerStats, statusOf, toShip } from '@/lib/owner/derive';
import { TABS } from '@/lib/owner/types';
import { shipOrders } from '@/app/owner/actions';
import { useOwner } from './OwnerContext';
import { sx } from './sx';
import { productDraft } from './tabs/ProductsTab';

interface Item {
  kind: string;
  label: string;
  meta: string;
  hay: string;
  go: () => void;
}

/** ⌘K / Ctrl+K quick-jump palette: arrow keys select, Enter jumps. */
export function Palette({ tasksCount }: { tasksCount: number }) {
  const { data, t, setUi, go, run } = useOwner();
  const [pq, setPq] = useState('');
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const close = () => setUi({ palette: false });
  const act = (fn: () => void) => () => {
    close();
    fn();
  };

  const pages: Item[] = TABS.map((k) => ({ kind: t.kinds.page, label: t.tabs[k], meta: k === 'today' && tasksCount ? String(tasksCount) : '', hay: t.tabs[k].toLowerCase() + ' ' + k, go: act(() => go(k)) }));
  const actions: Item[] = [
    [
      t.actions.shipAll,
      () => {
        const ids = data.orders.filter(toShip).map((o) => o.id);
        if (ids.length) void run(() => shipOrders(ids, 'ship'), t.toast.shipped(ids.length));
      },
    ] as const,
    [t.actions.newCode, () => go('promo', { modal: { kind: 'code', draft: { code: '', pct: true, value: '', min: '0', until: '', limit: '', first: false } }, modalErr: '' })] as const,
    [t.actions.addProduct, () => go('products', { modal: { kind: 'product', draft: productDraft() }, modalErr: '' })] as const,
    [t.actions.exportBh, () => go('insights')] as const,
  ].map(([label, fn]) => ({ kind: t.kinds.action, label, meta: '', hay: label.toLowerCase(), go: act(fn) }));
  const orders: Item[] = data.orders.map((o) => ({ kind: t.kinds.order, label: `${o.no} · ${customerName(o)}`, meta: t.status[statusOf(o)[0]], hay: `${o.no} ${customerName(o)} ${o.city} ${o.email}`.toLowerCase(), go: act(() => go('orders', { orderId: o.id })) }));
  const products: Item[] = data.products.map((p) => ({
    kind: t.kinds.product,
    label: p.name,
    meta: `${p.variants.reduce((a, v) => a + v.stock, 0)} in stock`,
    hay: `${p.name} ${p.category}`.toLowerCase(),
    go: act(() => go('products', { modal: { kind: 'product', draft: productDraft(p) }, modalErr: '' })),
  }));
  const emails = [...new Set(data.orders.map((o) => o.email.toLowerCase()))];
  const customers: Item[] = emails.map((em) => {
    const c = customerStats(data.orders, em);
    return { kind: t.kinds.customer, label: c.name, meta: t.ordersN(c.n), hay: `${c.name} ${em}`.toLowerCase(), go: act(() => go('orders', { view: 'list', lf: 'all', search: c.name })) };
  });

  const q = pq.trim().toLowerCase();
  const results = q
    ? [...pages, ...actions, ...orders, ...products, ...customers].filter((x) => x.hay.includes(q)).slice(0, 10)
    : [...actions.slice(0, 2), ...pages];

  return (
    <>
      <div onClick={close} style={sx('position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.5)')} />
      <div role="dialog" aria-modal="true" aria-label={t.quickJump} style={sx('position:fixed;top:12vh;left:50%;transform:translateX(-50%);z-index:61;width:560px;max-width:calc(100% - 32px);background:#1C1F25;border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:hidden')}>
        <div style={sx('display:flex;align-items:center;gap:10px;padding:0 16px;height:54px;border-bottom:1px solid rgba(255,255,255,.06);color:#6B727D')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3" />
          </svg>
          <input
            ref={ref}
            value={pq}
            role="combobox"
            aria-expanded="true"
            aria-controls="o-palette-list"
            aria-activedescendant={results[sel] ? `o-pal-${sel}` : undefined}
            onChange={(e) => {
              setPq(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(results.length - 1, s + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === 'Enter' && results[sel]) {
                e.preventDefault();
                results[sel].go();
              }
            }}
            placeholder={t.palettePh}
            style={sx('flex:1;min-width:0;border:0;background:transparent;color:#ECEEF1;font-size:15px;outline:none')}
          />
          <span style={sx("font-family:'DM Mono',monospace;font-size:11px;padding:2px 6px;border-radius:5px;background:#22262D")}>esc</span>
        </div>
        <div id="o-palette-list" role="listbox" style={sx('max-height:52vh;overflow-y:auto;padding:6px')}>
          {results.map((r, i) => (
            <button key={r.kind + r.label + i} id={`o-pal-${i}`} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={r.go} className="o-hov-pal" style={{ ...sx('width:100%;display:flex;align-items:center;gap:12px;padding:10px 12px;border:0;border-radius:10px;color:#ECEEF1;text-align:left;cursor:pointer'), background: i === sel ? '#23272E' : 'transparent' }}>
              <span style={sx('font-size:11px;color:#6B727D;width:64px;flex-shrink:0')}>{r.kind}</span>
              <span style={sx('flex:1;min-width:0;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{r.label}</span>
              <span style={sx('font-size:12px;color:#9AA1AC;white-space:nowrap')}>{r.meta}</span>
            </button>
          ))}
          {results.length === 0 && <div style={sx('padding:20px 12px;font-size:13px;color:#6B727D')}>{t.noMatches}</div>}
        </div>
      </div>
    </>
  );
}
