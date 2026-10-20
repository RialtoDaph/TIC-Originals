'use client';

import { awaiting, customerName, shortNo, deDec, dm, itemsText, needsAtt, statusOf, toCsv, toShip } from '@/lib/owner/derive';
import type { OOrder } from '@/lib/owner/types';
import { TONE } from '@/lib/tokens';
import { markDelivered, refundOrder, remindPayment, shipOrders } from '@/app/owner/actions';
import { useOwner, type UiState } from '../OwnerContext';
import { sx } from '../sx';
import { S, Seg, Thumb } from '../ui';

export function download(name: string, content: string, type = 'text/csv;charset=utf-8') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const LF: Record<UiState['lf'], (o: OOrder) => boolean> = {
  all: () => true,
  ship: toShip,
  way: (o) => o.status === 'shipped',
  done: (o) => o.status === 'delivered',
  issue: (o) => needsAtt(o) || awaiting(o) || o.status === 'cancelled' || o.status === 'returned' || o.flags.includes('oversold'),
};

export function matchSearch(o: OOrder, q: string) {
  if (!q) return true;
  const hay = [o.no, customerName(o), o.email, o.city, itemsText(o)].join(' ').toLowerCase();
  return hay.includes(q);
}

export function OrdersTab() {
  const { data, t, ui, setUi, run, eur, busy, toast } = useOwner();
  const q = ui.search.trim().toLowerCase();
  const qo = data.orders.filter((o) => matchSearch(o, q));
  const counts = new Map<string, number>();
  data.orders.forEach((o) => counts.set(o.email.toLowerCase(), (counts.get(o.email.toLowerCase()) ?? 0) + 1));
  const repeat = (o: OOrder) => counts.get(o.email.toLowerCase()) ?? 1;

  const COLS: [string, string, (o: OOrder) => boolean][] = [
    [t.cols.awaiting, '#F2B544', awaiting],
    [t.cols.ship, '#7C9CFF', toShip],
    [t.cols.way, '#9AA1AC', (o) => o.status === 'shipped'],
    [t.cols.att, '#FF6B5E', needsAtt],
  ];
  const closed = qo.filter((o) => !COLS.some((c) => c[2](o)));
  const listed = qo.filter(LF[ui.lf]);
  const shipList = data.orders.filter(toShip);

  const card = (o: OOrder, ci: number) => {
    const flag = o.flags.includes('oversold')
      ? t.flags.oversold
      : ci === 3
        ? t.flags.refundDue
        : awaiting(o)
          ? o.remindedAt
            ? t.flags.reminderSent
            : t.flags.since(dm(o.placedAt))
          : repeat(o) > 1
            ? t.flags.repeat(repeat(o))
            : o.status === 'shipped' && o.tracking
              ? `${o.carrier} ${o.tracking.slice(-6)}`
              : '';
    const next: [string, () => void][] = [
      [awaiting(o) && o.remindedAt ? t.next.remindAgain : t.next.remind, () => run(() => remindPayment(o.id, null), t.toast.reminderTo(customerName(o)))],
      [t.next.label, () => run(() => shipOrders([o.id], null), t.toast.shippedOne)],
      [t.next.delivered, () => run(() => markDelivered(o.id), t.toast.delivered(o.no))],
      [t.next.refund(eur(o.totalCents - o.refundedCents)), () => run(() => refundOrder(o.id, null), t.toast.refund(eur(o.totalCents - o.refundedCents)))],
    ];
    const red = ci === 3 || o.flags.includes('oversold');
    return (
      <div
        key={o.id}
        role="button"
        tabIndex={0}
        onClick={() => setUi({ orderId: o.id })}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), setUi({ orderId: o.id }))}
        className="o-hov-card"
        style={{ ...sx('background:#1F2228;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;cursor:pointer'), border: `1px solid ${red ? 'rgba(255,107,94,.3)' : 'transparent'}` }}
      >
        <div style={sx('display:flex;justify-content:space-between;align-items:baseline;gap:8px')}>
          <span style={sx("font-family:'DM Mono',monospace;font-size:12px;color:#9AA1AC")}>{shortNo(o.no)}</span>
          <span style={sx("font-family:'DM Mono',monospace;font-size:13px")}>{eur(o.totalCents)}</span>
        </div>
        <span style={sx('font-size:14px;font-weight:500')}>
          {customerName(o)} <span style={sx('font-size:12px;color:#6B727D;font-weight:400')}>· {o.city}</span>
        </span>
        <div style={sx('display:flex;gap:6px;align-items:center;flex-wrap:wrap')}>
          {o.items.slice(0, 3).map((i, k) => (
            <Thumb key={k} productId={i.productId} size={38} radius={8} />
          ))}
          <span style={sx('font-size:12px;color:#9AA1AC;flex:1;min-width:90px')}>{itemsText(o)}</span>
        </div>
        {flag && (
          <span style={{ ...sx('font-size:12px;padding:3px 9px;border-radius:20px;align-self:flex-start'), background: red ? TONE.red[0] : 'rgba(255,255,255,.06)', color: red ? TONE.red[1] : '#9AA1AC' }}>{flag}</span>
        )}
        <button
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            next[ci][1]();
          }}
          style={{ ...sx('height:34px;border:0;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer'), background: ci === 1 ? '#7C9CFF' : '#2A2E36', color: ci === 1 ? '#0E1220' : '#ECEEF1' }}
        >
          {next[ci][0]}
        </button>
      </div>
    );
  };

  const exportOrders = () =>
    download(
      'tic-orders.csv',
      toCsv([
        ['Order', 'Date', 'Customer', 'Email', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Status', 'Payment', 'Tracking'],
        ...qo.map((o) => [o.no, dm(o.placedAt), customerName(o), o.email, deDec(o.subtotalCents), deDec(o.discountCents), deDec(o.shippingCents), deDec(o.totalCents), o.status, o.payment, o.tracking]),
      ]),
    );

  return (
    <>
      <div style={sx('display:flex;align-items:center;gap:12px;flex-wrap:wrap')}>
        <h1 style={S.h1}>{t.tabs.orders}</h1>
        <Seg value={ui.view} options={[['board', t.board], ['list', t.list]]} onChange={(v) => setUi({ view: v })} />
        <button onClick={() => (shipList.length ? setUi({ packing: true }) : toast(t.nothingToPack))} style={S.neutralBtn}>
          {t.packingList}
        </button>
        <button onClick={exportOrders} style={S.neutralBtn}>
          {t.exportCsv}
        </button>
      </div>
      {q && (
        <div style={sx('display:flex;align-items:center;gap:10px;font-size:13px;color:#9AA1AC')}>
          {t.showingResults(ui.search)}
          <button onClick={() => setUi({ search: '' })} style={S.linkBtn}>
            {t.clear}
          </button>
        </div>
      )}

      {ui.view === 'board' ? (
        <>
          <div style={sx('display:grid;grid-template-columns:repeat(4,minmax(200px,1fr));gap:12px;overflow-x:auto;padding-bottom:4px')}>
            {COLS.map(([title, dot, fn], ci) => {
              const cs = qo.filter(fn);
              return (
                <section key={title} aria-label={title} style={sx('background:#181A1F;border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:10px;min-height:420px')}>
                  <div style={sx('display:flex;align-items:center;gap:8px;padding:4px 4px 4px;min-height:32px')}>
                    <span style={{ ...sx('width:8px;height:8px;border-radius:50%'), background: dot }} />
                    <span style={sx('font-size:14px;font-weight:600;flex:1')}>{title}</span>
                    {ci === 1 && cs.length > 1 && (
                      <button disabled={busy} onClick={() => run(() => shipOrders(cs.map((o) => o.id), 'ship'), t.toast.shipped(cs.length))} style={sx('height:28px;padding:0 10px;border:0;border-radius:8px;background:#7C9CFF;color:#0E1220;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap')}>
                        {t.shipAll}
                      </button>
                    )}
                    <span style={sx("font-family:'DM Mono',monospace;font-size:12px;color:#9AA1AC;padding:2px 8px;border-radius:10px;background:#22262D")}>{cs.length}</span>
                  </div>
                  {cs.map((o) => card(o, ci))}
                  {cs.length === 0 && <div style={sx('flex:1;border:1px dashed rgba(255,255,255,.08);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#6B727D;min-height:120px')}>{t.nothingHere}</div>}
                </section>
              );
            })}
          </div>
          <button onClick={() => setUi({ view: 'list', lf: 'done' })} className="o-hov-text" style={sx('align-self:flex-start;border:0;background:transparent;color:#9AA1AC;font-size:13px;cursor:pointer;padding:0')}>
            {t.closedLabel(closed.length)} →
          </button>
        </>
      ) : (
        <>
          <div style={sx('display:flex;gap:6px;flex-wrap:wrap')}>
            {(Object.keys(LF) as UiState['lf'][]).map((key) => {
              const on = ui.lf === key;
              return (
                <button key={key} aria-pressed={on} onClick={() => setUi({ lf: key })} style={{ ...sx('height:32px;padding:0 14px;border:0;border-radius:16px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap'), background: on ? '#ECEEF1' : '#1C1F25', color: on ? '#14161A' : '#9AA1AC' }}>
                  {t.chips[key]} {qo.filter(LF[key]).length}
                </button>
              );
            })}
          </div>
          <div style={sx('background:#1C1F25;border-radius:16px;overflow-x:auto')}>
            <div style={sx('min-width:760px;display:grid;grid-template-columns:150px 90px minmax(0,1.4fr) minmax(0,1fr) 100px 150px;gap:14px;padding:12px 18px;font-size:12px;color:#6B727D;border-bottom:1px solid rgba(255,255,255,.05)')}>
              <span>{t.listHead.order}</span>
              <span>{t.listHead.date}</span>
              <span>{t.listHead.customer}</span>
              <span>{t.listHead.items}</span>
              <span style={sx('text-align:right')}>{t.listHead.total}</span>
              <span>{t.listHead.status}</span>
            </div>
            {listed.map((o) => {
              const [key, tone] = statusOf(o);
              return (
                <button key={o.id} onClick={() => setUi({ orderId: o.id })} className="o-hov-row" style={sx('min-width:760px;width:100%;display:grid;grid-template-columns:150px 90px minmax(0,1.4fr) minmax(0,1fr) 100px 150px;gap:14px;align-items:center;padding:12px 18px;border:0;border-bottom:1px solid rgba(255,255,255,.04);background:transparent;color:#ECEEF1;text-align:left;cursor:pointer')}>
                  <span style={sx("font-family:'DM Mono',monospace;font-size:13px")}>{o.no}</span>
                  <span style={sx('font-size:13px;color:#9AA1AC')}>{dm(o.placedAt)}</span>
                  <span style={sx('font-size:14px;display:flex;gap:8px;align-items:center;min-width:0')}>
                    {customerName(o)}
                    {repeat(o) > 1 && <span style={sx('font-size:11px;padding:1px 7px;border-radius:10px;background:rgba(255,255,255,.07);color:#C4C8CF')}>×{repeat(o)}</span>}
                  </span>
                  <span style={sx('font-size:13px;color:#9AA1AC;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{itemsText(o)}</span>
                  <span style={sx("font-family:'DM Mono',monospace;font-size:13px;text-align:right")}>{eur(o.totalCents)}</span>
                  <span style={{ ...sx('justify-self:start;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;white-space:nowrap'), background: TONE[tone][0], color: TONE[tone][1] }}>{t.status[key]}</span>
                </button>
              );
            })}
            {listed.length === 0 && <div style={sx('padding:48px;text-align:center;font-size:14px;color:#6B727D')}>{t.noOrders}</div>}
          </div>
        </>
      )}
    </>
  );
}
