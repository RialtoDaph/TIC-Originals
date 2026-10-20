'use client';

import { accountingMonths, deDec, dm, dropMetrics, lastDays, orderHeat, pctDelta, periodStats, shortName, SIZES, toCsv, unitsSold } from '@/lib/owner/derive';
import { MONTHS_DE } from '@/i18n/owner';
import { useOwner } from '../OwnerContext';
import { sx } from '../sx';
import { S, Seg, Thumb } from '../ui';
import { download } from './OrdersTab';

const DAYS = { en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] };

export function bestLabel(day: number, hour: number, lang: 'de' | 'en') {
  return DAYS[lang][day] + ' ' + String(hour).padStart(2, '0') + ':00';
}

export function InsightsTab() {
  const { data, t, lang, now, ui, setUi, toast, eur, eur0 } = useOwner();
  const days = ui.aRange;
  const st = periodStats(data.orders, now, days);
  const kpis = [
    { label: t.revenue, value: eur0(st.rev), ...pctDelta(st.rev, st.prevRev) },
    { label: t.orders, value: String(st.n), ...pctDelta(st.n, st.prevN) },
    { label: t.aov, value: eur(Math.round(st.aov)), ...pctDelta(st.aov, st.prevAov) },
    { label: t.returning, value: Math.round(st.returning) + '%', ...pctDelta(st.returning, st.prevReturning) },
  ];
  const dayKeys = lastDays(now, days);
  const maxD = Math.max(1, ...st.cur.rev, ...st.prev.rev);
  const peakI = st.cur.rev.indexOf(Math.max(...st.cur.rev));
  const lbl = (i: number) => dm(new Date(dayKeys[i] + 'T12:00:00Z'));

  const { byProduct, bySize } = unitsSold(data.orders, now, days);
  const perf = data.products
    .map((p) => ({ p, ...(byProduct.get(p.id) ?? { units: 0, revenue: 0, returned: 0 }) }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);
  const topUnits = Math.max(1, perf[0]?.units ?? 0);
  const sizeTotal = SIZES.reduce((a, z) => a + (bySize.get(z) ?? 0), 0);
  const sizePct = SIZES.map((z) => (sizeTotal ? Math.round(((bySize.get(z) ?? 0) / sizeTotal) * 100) : 0));
  const maxPct = Math.max(1, ...sizePct);

  const { heat, peak } = orderHeat(data.orders, now);
  const best = bestLabel(peak.day, peak.hour, lang);
  const heatMax = Math.max(1, peak.v);

  // The two most recent drops by release date (the newer one may still be upcoming).
  const [a, b] = [...data.drops].sort((x, y) => x.liveAt.localeCompare(y.liveAt)).slice(-2);
  const bothLive = !!a && !!b && new Date(b.liveAt) <= now;
  const cmp = bothLive ? [dropMetrics(a, data.orders, data.products), dropMetrics(b, data.orders, data.products)] : null;

  const { year, months } = accountingMonths(data.orders, now);
  const tot = months.reduce((x, m) => ({ orders: x.orders + m.orders, gross: x.gross + m.gross, refunds: x.refunds + m.refunds, shipping: x.shipping + m.shipping, net: x.net + m.net }), { orders: 0, gross: 0, refunds: 0, shipping: 0, net: 0 });
  const exportMonths = () =>
    download(
      `tic-buchhaltung-${year}.csv`,
      toCsv([
        ['Monat', 'Bestellungen', 'Brutto', 'Erstattungen', 'Versand', 'Netto'],
        ...months.map((m) => [`${MONTHS_DE[m.month]} ${year}`, m.orders, deDec(m.gross), deDec(m.refunds), deDec(m.shipping), deDec(m.net)]),
        [`Gesamt ${year}`, tot.orders, deDec(tot.gross), deDec(tot.refunds), deDec(tot.shipping), deDec(tot.net)],
        ['Hinweis: Keine Umsatzsteuer gemäß § 19 UStG'],
      ]),
    );

  const fmtCmp = (v: number | null, unit: string) => {
    if (v === null) return '—';
    if (unit === '€') return eur0(v);
    if (unit === '%') return v.toFixed(v < 10 ? 1 : 0) + '%';
    if (unit) return Math.round(v) + unit;
    return v.toLocaleString('de-DE');
  };
  const cmpRows: [string, number | null, number | null, string, boolean][] = cmp
    ? [
        [t.dropRows.units, cmp[0].units, cmp[1].units, '', false],
        [t.dropRows.revenue, cmp[0].revenue, cmp[1].revenue, '€', false],
        [t.dropRows.sell, cmp[0].sell, cmp[1].sell, '%', false],
        [t.dropRows.soldOut, cmp[0].soldOutH, cmp[1].soldOutH, ' h', true],
        [t.dropRows.ret, cmp[0].ret, cmp[1].ret, '%', true],
      ]
    : [];

  return (
    <>
      <div style={sx('display:flex;align-items:center;gap:12px;flex-wrap:wrap')}>
        <h1 style={S.h1}>{t.tabs.insights}</h1>
        <Seg value={days} options={[[7, t.days(7)], [30, t.days(30)]]} onChange={(v) => setUi({ aRange: v })} />
      </div>
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px')}>
        {kpis.map((k) => (
          <div key={k.label} style={sx('background:#1C1F25;border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:8px')}>
            <span style={sx('font-size:13px;color:#9AA1AC')}>{k.label}</span>
            <span style={sx("font-family:'DM Mono',monospace;font-size:26px;letter-spacing:-.02em")}>{k.value}</span>
            <span style={{ fontSize: 12, color: k.good ? '#4ED29A' : '#FF6B5E' }}>{t.vsPrev(k.delta, days)}</span>
          </div>
        ))}
      </div>
      <div style={sx('background:#1C1F25;border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:14px')}>
        <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap')}>
          <span style={sx('font-size:15px;font-weight:600')}>{t.revPerDay}</span>
          <span style={sx('display:flex;gap:14px;font-size:12px;color:#9AA1AC')}>
            <span style={sx('display:flex;gap:6px;align-items:center')}>
              <span style={sx('width:10px;height:10px;border-radius:3px;background:#7C9CFF')} />
              {t.thisPeriod}
            </span>
            <span style={sx('display:flex;gap:6px;align-items:center')}>
              <span style={sx('width:12px;height:2px;background:#6B727D')} />
              {t.previous}
            </span>
          </span>
        </div>
        <div style={sx('height:180px;display:flex;align-items:flex-end;gap:3px')} role="img" aria-label={t.revPerDay}>
          {st.cur.rev.map((v, i) => (
            <div key={i} title={`${lbl(i)}: ${eur(v)} (${t.previous.toLowerCase()} ${eur(st.prev.rev[i])})`} style={sx('flex:1;height:100%;position:relative;display:flex;align-items:flex-end')}>
              <div style={{ ...sx('width:100%;border-radius:3px 3px 0 0'), height: (v / maxD) * 100 + '%', background: i === peakI && v > 0 ? '#A9BCFF' : '#4A5B9A' }} />
              <div style={{ ...sx('position:absolute;left:0;right:0;height:2px;background:#6B727D'), bottom: (st.prev.rev[i] / maxD) * 100 + '%' }} />
            </div>
          ))}
        </div>
        <div style={sx('display:flex;justify-content:space-between;font-size:12px;color:#6B727D')}>
          <span>{lbl(0)}</span>
          <span style={sx('color:#9AA1AC')}>{st.cur.rev[peakI] > 0 ? t.bestDay(lbl(peakI), eur(st.cur.rev[peakI])) : ''}</span>
          <span>{lbl(days - 1)}</span>
        </div>
      </div>
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px')}>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:6px 0 8px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;padding:12px 18px')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.topProducts}</span>
            <span style={sx('font-size:12px;color:#6B727D')}>{t.topNote}</span>
          </div>
          {perf.map((x, i) => {
            const ret = x.units ? (x.returned / x.units) * 100 : 0;
            return (
              <div key={x.p.id} style={sx('display:grid;grid-template-columns:18px 36px minmax(0,1fr) 34px 72px 44px;gap:12px;align-items:center;padding:8px 18px')}>
                <span style={sx('font-size:12px;color:#6B727D')}>{i + 1}</span>
                <Thumb productId={x.p.id} size={36} radius={8} />
                <div style={sx('display:flex;flex-direction:column;gap:6px;min-width:0')}>
                  <span style={sx('font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{shortName(x.p.name)}</span>
                  <div style={sx('height:4px;border-radius:2px;background:#2A2E36')}>
                    <div style={{ ...sx('height:4px;border-radius:2px;background:#7C9CFF'), width: (x.units / topUnits) * 100 + '%' }} />
                  </div>
                </div>
                <span style={sx("font-family:'DM Mono',monospace;font-size:13px;text-align:right")}>{x.units}</span>
                <span style={sx("font-family:'DM Mono',monospace;font-size:13px;text-align:right")}>{eur0(x.revenue)}</span>
                <span style={{ ...sx("font-family:'DM Mono',monospace;font-size:12px;text-align:right"), color: ret > 3 ? '#FF6B5E' : '#6B727D' }}>{ret.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
        <div style={sx('display:flex;flex-direction:column;gap:12px')}>
          <div style={sx('background:#1C1F25;border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:14px')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.sizeDemand}</span>
            <div style={sx('display:flex;flex-direction:column;gap:10px')}>
              {SIZES.map((z, i) => (
                <div key={z} style={sx('display:grid;grid-template-columns:28px minmax(0,1fr) 40px;gap:12px;align-items:center')}>
                  <span style={sx('font-size:14px;font-weight:600')}>{z}</span>
                  <div style={sx('height:10px;border-radius:5px;background:#2A2E36')}>
                    <div style={{ ...sx('height:10px;border-radius:5px;background:#7C9CFF'), width: (sizePct[i] / maxPct) * 100 + '%' }} />
                  </div>
                  <span style={sx("font-family:'DM Mono',monospace;font-size:13px;text-align:right")}>{sizePct[i]}%</span>
                </div>
              ))}
            </div>
            <span style={sx('font-size:12px;color:#9AA1AC')}>{t.sizeSplit(SIZES.map((z, i) => `${sizePct[i]} ${z}`).join(' · '))}</span>
          </div>
          <div style={sx('background:#1C1F25;border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:12px')}>
            <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap')}>
              <span style={sx('font-size:15px;font-weight:600')}>{t.whenOrder}</span>
              <span style={sx('font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;background:rgba(124,156,255,.14);color:#A9BCFF')}>{t.bestDrop(best)}</span>
            </div>
            <div style={sx('display:flex;flex-direction:column;gap:3px')}>
              {heat.map((r, di) => (
                <div key={di} style={sx('display:grid;grid-template-columns:24px repeat(24,minmax(0,1fr));gap:2px;align-items:center')}>
                  <span style={sx('font-size:11px;color:#6B727D')}>{DAYS[lang][di]}</span>
                  {r.map((v, h) => (
                    <span key={h} title={`${DAYS[lang][di]} ${h}:00 · ${t.ordersN(v)}`} style={{ ...sx('height:14px;border-radius:2px'), background: `rgba(124,156,255,${(0.05 + (v / heatMax) * 0.95).toFixed(2)})` }} />
                  ))}
                </div>
              ))}
              <div style={sx('display:grid;grid-template-columns:24px repeat(24,minmax(0,1fr));gap:2px;margin-top:4px')}>
                <span />
                {Array.from({ length: 24 }, (_, h) => (
                  <span key={h} style={sx('font-size:10px;color:#6B727D')}>
                    {h % 6 === 0 ? String(h).padStart(2, '0') : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px')}>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:6px 0 8px')}>
          <div style={sx('padding:12px 18px;font-size:15px;font-weight:600')}>{t.dropCmp(a?.name ?? '—', b?.name ?? '—')}</div>
          {cmp ? (
            cmpRows.map(([label, va, vb, unit, inv]) => {
              const d = va !== null && vb !== null ? pctDelta(vb, va, inv) : null;
              return (
                <div key={label} style={sx('display:grid;grid-template-columns:minmax(0,1.6fr) repeat(3,minmax(0,1fr));gap:12px;padding:9px 18px;font-size:13px')}>
                  <span style={sx('color:#C4C8CF')}>{label}</span>
                  <span style={sx("font-family:'DM Mono',monospace;text-align:right;color:#6B727D")}>{fmtCmp(va, unit)}</span>
                  <span style={sx("font-family:'DM Mono',monospace;text-align:right")}>{fmtCmp(vb, unit)}</span>
                  <span style={{ ...sx("font-family:'DM Mono',monospace;text-align:right"), color: d ? (d.good ? '#4ED29A' : '#FF6B5E') : '#6B727D' }}>{d ? d.delta : '—'}</span>
                </div>
              );
            })
          ) : (
            <div style={sx('padding:9px 18px 14px;font-size:13px;color:#6B727D')}>{t.dropNeedTwo}</div>
          )}
        </div>
        <div style={sx('border:1px dashed rgba(255,255,255,.1);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:12px;justify-content:center')}>
          <span style={sx('font-size:15px;font-weight:600')}>{t.funnel}</span>
          <span style={sx('font-size:13px;line-height:1.5;color:#9AA1AC')}>{t.funnelP}</span>
          {/* TODO(ga4): connect Google Analytics 4 (Data API) for funnel and traffic sources. Placeholder by design. */}
          <button onClick={() => toast(t.gaToast)} style={sx('align-self:flex-start;height:36px;padding:0 14px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:13px;font-weight:500;cursor:pointer')}>
            {t.connectGa}
          </button>
        </div>
      </div>
      <div style={sx('background:#1C1F25;border-radius:16px;padding:6px 0 8px')}>
        <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 18px')}>
          <span style={sx('font-size:15px;font-weight:600')}>{t.buchhaltung(year)}</span>
          <button onClick={exportMonths} style={sx('height:36px;padding:0 14px;border:0;border-radius:10px;background:#7C9CFF;color:#0E1220;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap')}>
            {t.csvSteuer}
          </button>
        </div>
        <div style={sx('overflow-x:auto')}>
          <div style={sx('min-width:600px;display:grid;grid-template-columns:minmax(0,1.2fr) 70px repeat(4,minmax(0,1fr));gap:12px;padding:8px 18px;font-size:12px;color:#6B727D')}>
            <span>{t.monthHead.month}</span>
            <span style={sx('text-align:right')}>{t.monthHead.orders}</span>
            <span style={sx('text-align:right')}>{t.monthHead.gross}</span>
            <span style={sx('text-align:right')}>{t.monthHead.refunds}</span>
            <span style={sx('text-align:right')}>{t.monthHead.ship}</span>
            <span style={sx('text-align:right')}>{t.monthHead.net}</span>
          </div>
          {[...months.map((m) => ({ label: MONTHS_DE[m.month], ...m, fw: 400 })), { label: t.totalYear(year), ...tot, fw: 600 }].map((m) => (
            <div key={m.label} style={{ ...sx('min-width:600px;display:grid;grid-template-columns:minmax(0,1.2fr) 70px repeat(4,minmax(0,1fr));gap:12px;padding:9px 18px;border-top:1px solid rgba(255,255,255,.04);font-size:13px'), fontWeight: m.fw }}>
              <span>{m.label}</span>
              <span style={sx("font-family:'DM Mono',monospace;text-align:right")}>{m.orders}</span>
              <span style={sx("font-family:'DM Mono',monospace;text-align:right")}>{eur(m.gross)}</span>
              <span style={sx("font-family:'DM Mono',monospace;text-align:right;color:#FF6B5E")}>{m.refunds ? '−' + eur(m.refunds) : '—'}</span>
              <span style={sx("font-family:'DM Mono',monospace;text-align:right")}>{eur(m.shipping)}</span>
              <span style={sx("font-family:'DM Mono',monospace;text-align:right")}>{eur(m.net)}</span>
            </div>
          ))}
        </div>
        <div style={sx('padding:10px 18px 6px;font-size:12px;color:#6B727D')}>{t.feesNote}</div>
      </div>
    </>
  );
}
