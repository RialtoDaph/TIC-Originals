'use client';

import { customerName, itemsText, shortName, shortNo, toShip } from '@/lib/owner/derive';
import { useOwner } from './OwnerContext';
import { sx } from './sx';
import { Thumb } from './ui';

export function PackingList() {
  const { data, t, setUi } = useOwner();
  const orders = data.orders.filter(toShip);
  const agg = new Map<string, { productId: string | null; name: string; size: string; qty: number }>();
  for (const o of orders)
    for (const i of o.items) {
      const k = (i.productId ?? i.name) + '|' + i.size;
      const cur = agg.get(k) ?? { productId: i.productId, name: i.name, size: i.size, qty: 0 };
      cur.qty += i.qty;
      agg.set(k, cur);
    }
  const rows = [...agg.values()].sort((a, b) => a.name.localeCompare(b.name) || a.size.localeCompare(b.size));
  const close = () => setUi({ packing: false });
  return (
    <>
      <div className="o-no-print" onClick={close} style={sx('position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.5)')} />
      <div className="o-print-root" role="dialog" aria-modal="true" aria-label={t.packingList} style={sx('position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:41;width:600px;max-width:calc(100% - 32px);max-height:calc(100vh - 48px);overflow-y:auto;background:#1C1F25;border-radius:18px;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.5)')}>
        <div style={sx('padding:20px 22px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px')}>
          <div style={sx('display:flex;flex-direction:column;gap:4px')}>
            <span style={sx('font-size:20px;font-weight:600')}>{t.packingList}</span>
            <span style={sx('font-size:13px;color:#9AA1AC')}>{t.packSub(orders.length, rows.reduce((a, r) => a + r.qty, 0))}</span>
          </div>
          <button className="o-no-print" onClick={close} aria-label={t.close} style={sx('width:36px;height:36px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:18px;cursor:pointer')}>
            ×
          </button>
        </div>
        <div style={sx('padding:0 22px')}>
          {rows.map((r) => (
            <div key={r.name + r.size} style={sx('display:grid;grid-template-columns:44px minmax(0,1fr) 40px 50px;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)')}>
              <Thumb productId={r.productId} size={44} radius={9} />
              <span style={sx('font-size:14px')}>{shortName(r.name)}</span>
              <span style={sx('font-size:15px;font-weight:600;text-align:center')}>{r.size}</span>
              <span style={sx("font-family:'DM Mono',monospace;font-size:16px;text-align:right;color:#A9BCFF")}>×{r.qty}</span>
            </div>
          ))}
        </div>
        <div style={sx('padding:14px 22px;display:flex;flex-direction:column;gap:6px')}>
          {orders.map((o) => (
            <span key={o.id} style={sx('font-size:12px;color:#9AA1AC')}>
              {shortNo(o.no)} · {customerName(o)}, {o.city} — {itemsText(o)}
            </span>
          ))}
        </div>
        <div className="o-no-print" style={sx('padding:12px 22px 20px;display:flex;justify-content:flex-end;gap:8px')}>
          <button onClick={close} style={sx('height:38px;padding:0 16px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:13px;font-weight:500;cursor:pointer')}>
            {t.close}
          </button>
          <button onClick={() => window.print()} style={sx('height:38px;padding:0 18px;border:0;border-radius:10px;background:#7C9CFF;color:#0E1220;font-size:13px;font-weight:600;cursor:pointer')}>
            {t.print}
          </button>
        </div>
      </div>
    </>
  );
}
