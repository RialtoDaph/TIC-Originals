'use client';

import { useEffect, useRef, useState } from 'react';
import { countryName } from '@/lib/countries';
import { awaiting, customerName, customerStats, needsAtt, shortName, toShip } from '@/lib/owner/derive';
import { TONE } from '@/lib/tokens';
import { deleteOrder, emailInvoice, markDelivered, markReturned, refundOrder, remindPayment, shipOrders, updateOrderFields } from '@/app/owner/actions';
import { useOwner } from './OwnerContext';
import { sx } from './sx';
import { Thumb } from './ui';

const CARRIERS = ['DHL', 'DPD', 'Hermes', 'UPS', 'GLS'];

export function OrderDrawer() {
  const { data, t, ui, setUi, run, eur, busy } = useOwner();
  const od = data.orders.find((o) => o.id === ui.orderId);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tracking, setTracking] = useState(od?.tracking ?? '');
  const [note, setNote] = useState(od?.note ?? '');
  const [armed, setArmed] = useState(false);
  const [invMsg, setInvMsg] = useState('');

  useEffect(() => closeRef.current?.focus(), []);
  if (!od) return null;
  const close = () => setUi({ orderId: null });
  const c = customerStats(data.orders, od.email);
  const steps: [string, boolean][] = [
    [t.steps[0], true],
    [t.steps[1], od.payment === 'paid' || od.payment === 'refunded'],
    [t.steps[2], ['shipped', 'delivered', 'returned'].includes(od.status)],
    [t.steps[3], ['delivered', 'returned'].includes(od.status)],
  ];
  const amount = od.totalCents - od.refundedCents;
  const primary: [string, string, string, string, () => void] | null = needsAtt(od)
    ? [t.primary.refund, t.next.refund(eur(amount)), '#FF6B5E', TONE.red[0], () => run(() => refundOrder(od.id, null), t.toast.refund(eur(amount)))]
    : toShip(od)
      ? [t.primary.ship, t.next.label, '#7C9CFF', TONE.blue[0], () => run(() => shipOrders([od.id], null), t.toast.shippedOne)]
      : awaiting(od)
        ? [t.primary.awaiting, t.next.remind, '#F2B544', TONE.amber[0], () => run(() => remindPayment(od.id, null), t.toast.reminder)]
        : od.status === 'shipped'
          ? [t.primary.shipped(od.carrier), t.next.delivered, '#9AA1AC', 'rgba(255,255,255,.05)', () => run(() => markDelivered(od.id), t.toast.delivered(od.no))]
          : od.status === 'delivered' && od.payment === 'paid'
            ? [t.primary.delivered, t.markReturned, '#9AA1AC', 'rgba(255,255,255,.05)', () => run(() => markReturned(od.id), t.toast.returned(od.no))]
            : null;
  const address = [od.street, od.extra, `${od.zip} ${od.city}, ${countryName(od.country, 'de')}`].filter(Boolean).join('\n');
  const date = new Date(od.placedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const input = sx('height:40px;padding:0 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#14161A;color:#ECEEF1;font-size:14px;outline:none;box-sizing:border-box;min-width:0');

  return (
    <>
      <div onClick={close} style={sx('position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.5)')} />
      <aside role="dialog" aria-modal="true" aria-label={od.no} style={sx('position:fixed;top:0;right:0;bottom:0;width:500px;max-width:100%;z-index:41;background:#1C1F25;display:flex;flex-direction:column;overflow-y:auto;box-shadow:-20px 0 60px rgba(0,0,0,.4)')}>
        <div style={sx('padding:20px 22px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px')}>
          <div style={sx('display:flex;flex-direction:column;gap:6px')}>
            <span style={sx("font-family:'DM Mono',monospace;font-size:20px")}>{od.no}</span>
            <span style={sx('font-size:13px;color:#9AA1AC')}>
              {date} · {od.method || '—'}
            </span>
          </div>
          <button ref={closeRef} onClick={close} aria-label={t.close} style={sx('width:36px;height:36px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:18px;cursor:pointer')}>
            ×
          </button>
        </div>
        <div style={sx('padding:0 22px 18px;display:flex;gap:4px')}>
          {steps.map(([label, on], i) => (
            <div key={label} style={sx('flex:1;display:flex;flex-direction:column;gap:6px')}>
              <span style={{ ...sx('height:4px;border-radius:2px'), background: on ? (needsAtt(od) && i === 3 ? '#FF6B5E' : '#7C9CFF') : '#2A2E36' }} />
              <span style={{ fontSize: 12, color: on ? '#ECEEF1' : '#6B727D' }}>{label}</span>
            </div>
          ))}
        </div>
        {od.flags.includes('oversold') && (
          <div style={{ ...sx('margin:0 22px 12px;padding:10px 14px;border-radius:12px;font-size:13px'), background: TONE.red[0], color: TONE.red[1] }}>{t.flags.oversold}</div>
        )}
        {primary && (
          <div style={{ ...sx('margin:0 22px 18px;padding:14px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:12px'), background: primary[3] }}>
            <span style={sx('font-size:13px;color:#ECEEF1')}>{primary[0]}</span>
            <button disabled={busy} onClick={primary[4]} style={{ ...sx('height:36px;padding:0 14px;border:0;border-radius:10px;color:#0E1220;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap'), background: primary[2] }}>
              {primary[1]}
            </button>
          </div>
        )}
        <div style={sx('padding:0 22px 8px;display:flex;flex-direction:column')}>
          {od.items.map((i, k) => (
            <div key={k} style={sx('display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)')}>
              <Thumb productId={i.productId} size={48} radius={10} />
              <div style={sx('flex:1;display:flex;flex-direction:column;gap:3px;min-width:0')}>
                <span style={sx('font-size:14px')}>{shortName(i.name)}</span>
                <span style={sx('font-size:12px;color:#9AA1AC')}>{t.sizeQty(i.size, i.qty)}</span>
              </div>
              <span style={sx("font-family:'DM Mono',monospace;font-size:13px")}>{eur(i.unitCents * i.qty)}</span>
            </div>
          ))}
          <div style={sx('display:flex;flex-direction:column;gap:6px;padding:12px 0;font-size:13px')}>
            <div style={sx('display:flex;justify-content:space-between;color:#9AA1AC')}>
              <span>{t.subtotal}</span>
              <span style={sx("font-family:'DM Mono',monospace")}>{eur(od.subtotalCents)}</span>
            </div>
            {od.discountCents > 0 && (
              <div style={sx('display:flex;justify-content:space-between;color:#9AA1AC')}>
                <span>{t.discount(od.discountCode ?? '')}</span>
                <span style={sx("font-family:'DM Mono',monospace")}>−{eur(od.discountCents)}</span>
              </div>
            )}
            <div style={sx('display:flex;justify-content:space-between;color:#9AA1AC')}>
              <span>{t.shipping}</span>
              <span style={sx("font-family:'DM Mono',monospace")}>{od.shippingCents ? eur(od.shippingCents) : t.free}</span>
            </div>
            <div style={sx('display:flex;justify-content:space-between;font-size:15px;font-weight:600;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)')}>
              <span>{t.total}</span>
              <span style={sx("font-family:'DM Mono',monospace")}>{eur(od.totalCents)}</span>
            </div>
            <span style={sx('font-size:11px;color:#6B727D')}>{t.noVat}</span>
          </div>
        </div>
        <div style={sx('margin:0 22px 14px;padding:14px;border-radius:12px;background:#14161A;display:flex;flex-direction:column;gap:6px')}>
          <div style={sx('display:flex;justify-content:space-between;gap:12px')}>
            <span style={sx('font-size:14px;font-weight:600')}>{customerName(od)}</span>
            {c.n > 1 && <span style={sx('font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:rgba(124,156,255,.14);color:#A9BCFF')}>{t.repeatCustomer}</span>}
          </div>
          <a href={`mailto:${od.email}`} style={sx('font-size:13px;color:#9AA1AC;overflow-wrap:anywhere')}>
            {od.email}
          </a>
          <span style={sx('font-size:13px;line-height:1.5;color:#C4C8CF;white-space:pre-line')}>{address}</span>
          {od.phone && <span style={sx('font-size:13px;color:#9AA1AC')}>{od.phone}</span>}
          <span style={sx('font-size:12px;color:#9AA1AC')}>{c.n > 1 ? t.hist(c.n, eur(c.spent), c.size) : t.firstOrder}</span>
        </div>
        <div style={sx('padding:0 22px 14px;display:grid;grid-template-columns:120px minmax(0,1fr);gap:10px')}>
          <label style={sx('display:flex;flex-direction:column;gap:6px')}>
            <span style={sx('font-size:12px;color:#9AA1AC')}>{t.carrier}</span>
            <select value={od.carrier} onChange={(e) => run(() => updateOrderFields(od.id, { carrier: e.target.value }), `${t.carrier}: ${e.target.value}`)} style={sx('height:40px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#14161A;color:#ECEEF1;font-size:14px;outline:none')}>
              {[...new Set([od.carrier, ...CARRIERS])].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label style={sx('display:flex;flex-direction:column;gap:6px')}>
            <span style={sx('font-size:12px;color:#9AA1AC')}>{t.tracking}</span>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} onBlur={() => tracking !== od.tracking && run(() => updateOrderFields(od.id, { tracking }), `${t.tracking} ✓`)} placeholder={t.trackingPh} style={{ ...input, fontFamily: "'DM Mono',monospace", fontSize: 13 }} />
          </label>
        </div>
        <label style={sx('padding:0 22px 14px;display:flex;flex-direction:column;gap:6px')}>
          <span style={sx('font-size:12px;color:#9AA1AC')}>{t.note}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== od.note && run(() => updateOrderFields(od.id, { note }), `${t.note} ✓`)} placeholder={t.notePh} rows={2} style={sx('padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#14161A;color:#ECEEF1;font-size:14px;outline:none;resize:vertical')} />
        </label>
        <div style={sx('padding:0 22px 14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
          <a href={`/owner/invoice/${od.id}`} target="_blank" rel="noreferrer" style={sx('height:36px;padding:0 14px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center')}>
            {t.invoicePdf}
          </a>
          <button
            disabled={busy || od.payment === 'pending'}
            onClick={async () => {
              const ok = await run(() => emailInvoice(od.id), t.invoiceSent(od.email));
              if (ok) setInvMsg(t.invoiceSent(od.email));
            }}
            style={sx('height:36px;padding:0 14px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:13px;font-weight:500;cursor:pointer')}
          >
            {t.emailInvoice}
          </button>
          {invMsg && <span style={sx('font-size:12px;color:#4ED29A')}>{invMsg}</span>}
        </div>
        <div style={sx('margin-top:auto;padding:16px 22px 22px;display:flex;justify-content:flex-end')}>
          <button
            disabled={busy}
            onBlur={() => setArmed(false)}
            onClick={async () => {
              if (!armed) return setArmed(true);
              const ok = await run(() => deleteOrder(od.id), t.toast.orderDeleted);
              if (ok) close();
            }}
            style={{ ...sx('height:34px;padding:0 12px;border:0;border-radius:9px;font-size:13px;cursor:pointer'), background: armed ? '#FF6B5E' : 'transparent', color: armed ? '#14161A' : '#6B727D' }}
          >
            {armed ? t.deleteConfirm : t.deleteOrder}
          </button>
        </div>
      </aside>
    </>
  );
}
