'use client';

import { dm, restockSuggestions, shortName, SIZES } from '@/lib/owner/derive';
import { categoryLabel } from '@/lib/categories';
import { TONE } from '@/lib/tokens';
import { addStock, setProductVisible, setRestockOrdered } from '@/app/owner/actions';
import { useOwner } from '../OwnerContext';
import { sx } from '../sx';
import { S, Thumb, Toggle } from '../ui';
import type { OProduct } from '@/lib/owner/types';

export function productDraft(p?: OProduct) {
  return p
    ? { id: p.id, name: p.name, category: categoryLabel(p.category), price: (p.priceCents / 100).toFixed(2), low: String(p.lowStock), stock: Object.fromEntries(SIZES.map((z) => [z, String(p.variants.find((v) => v.size === z)?.stock ?? 0)])) }
    : { name: '', category: '', price: '', low: '', stock: Object.fromEntries(SIZES.map((z) => [z, '0'])) };
}

export function ProductsTab() {
  const { data, t, now, setUi, run, eur, busy } = useOwner();
  const rs = restockSuggestions(data.products, data.orders, now);
  const grid = 'minmax(0,2.2fr) 84px repeat(4,54px) minmax(0,1fr) 84px 50px';

  return (
    <>
      <div style={sx('display:flex;align-items:center;gap:12px;flex-wrap:wrap')}>
        <h1 style={S.h1}>{t.tabs.products}</h1>
        <button onClick={() => setUi({ modal: { kind: 'product', draft: productDraft() }, modalErr: '' })} style={S.primaryBtn}>
          {t.addProduct}
        </button>
      </div>
      {rs.length > 0 && (
        <div style={sx('background:#1C1F25;border-radius:16px;padding:6px 0')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;padding:12px 18px')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.restockH}</span>
            <span style={sx('font-size:12px;color:#6B727D')}>{t.restockNote}</span>
          </div>
          {rs.map((r) => {
            const done = r.product.restockOrdered;
            const tone = done ? 'green' : r.now ? 'red' : 'amber';
            return (
              <div key={r.product.id} style={{ ...sx('display:flex;align-items:center;gap:14px;padding:12px 18px;border-top:1px solid rgba(255,255,255,.05);flex-wrap:wrap'), opacity: done ? 0.55 : 1 }}>
                <Thumb productId={r.product.id} size={44} radius={9} />
                <div style={sx('flex:1 1 240px;min-width:0;display:flex;flex-direction:column;gap:3px')}>
                  <span style={sx('font-size:14px;font-weight:600')}>
                    {t.restockOrder(r.lines.map((l) => `${l.qty} × ${l.size}`).join(' + '))} <span style={sx('font-weight:400;color:#9AA1AC')}>· {shortName(r.product.name)}</span>
                  </span>
                  <span style={sx('font-size:12px;color:#9AA1AC')}>{r.lines.map((l) => (l.stock === 0 ? t.soldOutW(l.size, l.waiting) : t.runsOut(l.size, Math.round(l.days)))).join(' · ')}</span>
                </div>
                <span style={{ ...sx('font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;white-space:nowrap'), background: TONE[tone][0], color: TONE[tone][1] }}>{done ? t.ordered : r.now ? t.orderNow : t.orderBy(dm(r.orderBy))}</span>
                <button disabled={busy} onClick={() => run(() => setRestockOrdered([r.product.id], !done, null), done ? t.undone : t.toast.restockMarked)} style={{ ...sx('height:34px;padding:0 14px;border:0;border-radius:9px;background:#2A2E36;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap'), color: done ? '#9AA1AC' : '#ECEEF1' }}>
                  {done ? t.undo : t.markOrdered}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div style={sx('background:#1C1F25;border-radius:16px;overflow-x:auto')}>
        <div style={{ ...sx('min-width:860px;display:grid;gap:10px;padding:12px 18px;font-size:12px;color:#6B727D;border-bottom:1px solid rgba(255,255,255,.05)'), gridTemplateColumns: grid }}>
          <span>{t.prodHead.product}</span>
          <span>{t.prodHead.price}</span>
          {SIZES.map((z) => (
            <span key={z} style={sx('text-align:center')}>
              {z}
            </span>
          ))}
          <span>{t.prodHead.waitlist}</span>
          <span>{t.prodHead.visible}</span>
          <span />
        </div>
        {data.products.map((p) => {
          const total = p.variants.reduce((a, v) => a + v.stock, 0);
          const w = Object.entries(p.waitlist).filter(([, n]) => n > 0);
          return (
            <div key={p.id} style={{ ...sx('min-width:860px;display:grid;gap:10px;align-items:center;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,.04)'), gridTemplateColumns: grid, opacity: p.visible ? 1 : 0.5 }}>
              <div style={sx('display:flex;align-items:center;gap:12px;min-width:0')}>
                <Thumb productId={p.id} size={42} radius={9} />
                <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}>
                  <span style={sx('font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{p.name}</span>
                  <span style={sx('font-size:12px;color:#6B727D')}>{t.inStock(`${categoryLabel(p.category)} · ${t.alert(p.lowStock)}`, total)}</span>
                </span>
              </div>
              <span style={sx("font-family:'DM Mono',monospace;font-size:13px")}>{eur(p.priceCents)}</span>
              {SIZES.map((z) => {
                const v = p.variants.find((x) => x.size === z);
                if (!v) return <span key={z} style={sx('text-align:center;color:#4A505A')}>—</span>;
                const q = v.stock;
                const bg = q === 0 ? TONE.red[0] : q <= p.lowStock ? TONE.amber[0] : '#23272E';
                const fg = q === 0 ? '#FF6B5E' : q <= p.lowStock ? '#F2B544' : '#C4C8CF';
                return (
                  <button key={z} disabled={busy} onClick={() => run(() => addStock(v.id, 10), `${shortName(p.name)} · ${z}: +10`)} title={t.addTen} aria-label={`${p.name} ${z}: ${q} — ${t.addTen}`} className="o-hov-cell" style={{ ...sx("height:36px;border:0;border-radius:8px;font-family:'DM Mono',monospace;font-size:13px;cursor:pointer"), background: bg, color: fg }}>
                    {q}
                  </button>
                );
              })}
              <span style={{ fontSize: 12, color: w.length ? '#A9BCFF' : '#4A505A' }}>{w.length ? w.map(([z, n]) => t.waitingFor(n, z)).join(', ') : '—'}</span>
              <Toggle on={p.visible} label={`${p.name}: ${t.prodHead.visible}`} disabled={busy} onClick={() => run(() => setProductVisible(p.id, !p.visible), p.visible ? t.hidden(shortName(p.name)) : t.visibleNow(shortName(p.name)))} />
              <button onClick={() => setUi({ modal: { kind: 'product', draft: productDraft(p) }, modalErr: '' })} style={S.linkBtn}>
                {t.edit}
              </button>
            </div>
          );
        })}
        {data.products.length === 0 && <div style={sx('padding:48px;text-align:center;font-size:14px;color:#6B727D')}>{t.noProducts}</div>}
      </div>
      <span style={sx('font-size:12px;color:#6B727D')}>{t.tip}</span>
    </>
  );
}
