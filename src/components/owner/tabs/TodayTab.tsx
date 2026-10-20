'use client';

import { useEffect, useState } from 'react';
import { berlinDay, dm, kleinunternehmer, lastDays, lowStock, pctDelta, periodStats, revenueByDay, shortName } from '@/lib/owner/derive';
import { TONE } from '@/lib/tokens';
import { undoActivity } from '@/app/owner/actions';
import { useOwner } from '../OwnerContext';
import { sx } from '../sx';
import { Thumb } from '../ui';
import type { Task } from '../useTasks';

const WD = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] };

export function TodayTab({ tasks }: { tasks: Task[] }) {
  const { data, t, lang, now, go, run, eur, eur0, busy } = useOwner();
  const today = berlinDay(now);
  const laterKey = 'tic-owner-later-' + today;
  const [later, setLater] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore per-day "Later" choices
      setLater(JSON.parse(localStorage.getItem(laterKey) || '[]'));
    } catch {}
  }, [laterKey]);
  const deferTask = (id: string) => {
    const next = [...later.filter((x) => x !== id), id];
    setLater(next);
    setOpen(null);
    try {
      localStorage.setItem(laterKey, JSON.stringify(next));
    } catch {}
  };

  const visible = [...tasks.filter((x) => !later.includes(x.id)), ...tasks.filter((x) => later.includes(x.id))];
  const openId = open === undefined ? visible[0]?.id : open;

  // Headline
  const has = (p: string) => tasks.some((x) => x.id === p || x.id.startsWith(p));
  const restockN = tasks.find((x) => x.id === 'restock')?.rows.length ?? 0;
  const shipN = tasks.find((x) => x.id === 'ship')?.rows.length ?? 0;
  const parts = [has('ship') && t.headlineParts.ship(shipN), has('ref') && t.headlineParts.refund, has('restock') && t.headlineParts.restock(restockN), has('pay') && t.headlineParts.pay].filter(Boolean) as string[];
  const todayRev = revenueByDay(data.orders, [today]).rev[0];

  // Done today (task actions since midnight, newest first; only the latest can be undone).
  const hist = data.activity.filter((a) => a.taskKey && berlinDay(a.at) === today).slice(0, 6);

  // This week
  const ws = periodStats(data.orders, now, 7);
  const week = [
    { label: t.revenue, value: eur0(ws.rev), ...pctDelta(ws.rev, ws.prevRev) },
    { label: t.orders, value: String(ws.n), ...pctDelta(ws.n, ws.prevN) },
    { label: t.avgOrder, value: eur(Math.round(ws.aov)), ...pctDelta(ws.aov, ws.prevAov) },
    { label: t.returnRate, value: ws.returnRate.toFixed(1).replace('.', ',') + '%', ...pctDelta(ws.returnRate, ws.prevReturnRate, true) },
  ];
  const days7 = lastDays(now, 7);
  const wMax = Math.max(1, ...ws.cur.rev);

  const ku = kleinunternehmer(data.orders, now);
  const kuTone = ku.projPct >= 1 ? 'red' : ku.projPct >= 0.9 ? 'amber' : 'green';
  const low = lowStock(data.products);
  const dateLine = now.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={sx('display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start')}>
      <main style={sx('flex:1 1 560px;min-width:0;display:flex;flex-direction:column;gap:12px')}>
        <span style={sx('font-size:14px;color:#9AA1AC')}>{dateLine}</span>
        <h1 style={sx('margin:0 0 12px;font-size:30px;line-height:1.25;font-weight:600;letter-spacing:-.015em;text-wrap:pretty')}>{t.headline(parts, tasks.length, eur0(todayRev))}</h1>
        {visible.map((task) => {
          const o = openId === task.id;
          const [tint, fg] = TONE[task.tone];
          return (
            <div key={task.id} style={{ ...sx('border-radius:16px;overflow:hidden'), background: o ? '#1C1F25' : '#181A1F', border: `1px solid ${o ? 'rgba(124,156,255,.25)' : 'transparent'}` }}>
              <button onClick={() => setOpen(o ? null : task.id)} aria-expanded={o} style={sx('width:100%;display:flex;align-items:center;gap:14px;padding:14px 16px;border:0;background:transparent;color:#ECEEF1;text-align:left;cursor:pointer')}>
                <span style={{ ...sx('width:38px;height:38px;flex-shrink:0;border-radius:11px;display:flex;align-items:center;justify-content:center'), background: tint, color: fg }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={task.icon} />
                  </svg>
                </span>
                <span style={sx('flex:1;display:flex;flex-direction:column;gap:3px;min-width:0')}>
                  <span style={sx('font-size:15px;font-weight:600')}>{task.title}</span>
                  <span style={sx('font-size:13px;color:#9AA1AC;text-wrap:pretty')}>{task.sub}</span>
                </span>
                <span style={sx('font-size:12px;color:#6B727D')}>{o ? '▲' : '▼'}</span>
              </button>
              {o && (
                <div style={sx('padding:0 16px 16px;display:flex;flex-direction:column;gap:12px')}>
                  {task.rows.length > 0 && (
                    <div style={sx('display:flex;flex-direction:column;border-radius:12px;background:#14161A;overflow:hidden')}>
                      {task.rows.map(([pid, a, b, c], i) => (
                        <div key={i} style={sx('display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04)')}>
                          <Thumb productId={pid} size={38} radius={8} />
                          <span style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:2px')}>
                            <span style={sx('font-size:13px;font-weight:500')}>{a}</span>
                            <span style={sx('font-size:12px;color:#9AA1AC;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{b}</span>
                          </span>
                          <span style={sx("font-family:'DM Mono',monospace;font-size:13px;white-space:nowrap")}>{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={sx('display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap')}>
                    <button onClick={() => deferTask(task.id)} style={sx('height:38px;padding:0 16px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:13px;font-weight:500;cursor:pointer')}>
                      {t.later}
                    </button>
                    <button
                      disabled={busy}
                      onClick={async () => {
                        setOpen(undefined);
                        await task.run();
                      }}
                      style={sx('height:38px;padding:0 18px;border:0;border-radius:10px;background:#7C9CFF;color:#0E1220;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap')}
                    >
                      {task.action}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {tasks.length === 0 && <div style={sx('border-radius:16px;background:#181A1F;padding:40px 20px;text-align:center;font-size:15px;color:#4ED29A')}>{t.nothingLeft}</div>}
        {hist.length > 0 && (
          <div style={sx('margin-top:12px;display:flex;flex-direction:column;gap:6px')}>
            <span style={sx('font-size:13px;color:#6B727D')}>{t.doneToday}</span>
            {hist.map((h) => (
              <div key={h.id} style={sx('display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:12px;background:#181A1F;font-size:14px;color:#9AA1AC')}>
                <span style={sx('color:#4ED29A')}>✓</span>
                <span style={sx('flex:1')}>{h.text}</span>
                {h.canUndo && (
                  <button disabled={busy} onClick={() => run(() => undoActivity(h.id), t.undone)} style={sx('border:0;background:transparent;color:#A9BCFF;font-size:13px;cursor:pointer')}>
                    {t.undo}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <aside style={sx('flex:0 1 320px;min-width:280px;display:flex;flex-direction:column;gap:12px')}>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.thisWeek}</span>
            <button onClick={() => go('insights')} style={sx('border:0;background:transparent;color:#A9BCFF;font-size:13px;cursor:pointer')}>
              {t.insightsLink}
            </button>
          </div>
          {week.map((s) => (
            <div key={s.label} style={sx('display:flex;justify-content:space-between;align-items:baseline;gap:12px')}>
              <span style={sx('font-size:14px;color:#C4C8CF')}>{s.label}</span>
              <span style={sx('display:flex;gap:8px;align-items:baseline')}>
                <span style={sx("font-family:'DM Mono',monospace;font-size:16px")}>{s.value}</span>
                <span style={{ fontSize: 12, color: s.good ? '#4ED29A' : '#FF6B5E' }}>{s.delta}</span>
              </span>
            </div>
          ))}
          <div style={sx('display:flex;align-items:flex-end;gap:5px;height:64px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)')}>
            {ws.cur.rev.map((v, i) => {
              const d = new Date(days7[i] + 'T12:00:00Z');
              return (
                <div key={i} title={`${dm(d)} · ${eur(v)}`} style={sx('flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end')}>
                  <span style={{ ...sx('width:100%;border-radius:4px'), height: `${(v / wMax) * 100}%`, background: i === 6 ? '#7C9CFF' : '#2F343D' }} />
                  <span style={sx('font-size:10px;color:#6B727D')}>{WD[lang][d.getUTCDay()]}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:8px')}>
            <span style={sx('font-size:15px;font-weight:600')}>Kleinunternehmer</span>
            <span style={{ ...sx('font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;white-space:nowrap'), background: TONE[kuTone][0], color: TONE[kuTone][1] }}>{ku.projPct >= 1 ? t.kuTag.over : ku.projPct >= 0.9 ? t.kuTag.close : t.kuTag.ok}</span>
          </div>
          <span style={sx("font-family:'DM Mono',monospace;font-size:22px")}>
            {eur0(ku.ytd)} <span style={sx('font-size:13px;color:#6B727D')}>/ {eur0(ku.limit)}</span>
          </span>
          <div style={sx('position:relative;height:8px;border-radius:4px;background:#2A2E36')}>
            <div style={{ ...sx('position:absolute;left:0;top:0;bottom:0;border-radius:4px'), width: Math.min(100, Math.max(0, ku.pct * 100)) + '%', background: ku.pct >= 0.9 ? '#FF6B5E' : '#F2B544' }} />
            <div title={t.projected} style={{ ...sx('position:absolute;top:-4px;bottom:-4px;width:2px;border-radius:1px;background:#ECEEF1'), left: Math.min(99, Math.max(0, ku.projPct * 100)) + '%' }} />
          </div>
          <span style={sx('font-size:13px;line-height:1.5;color:#9AA1AC;text-wrap:pretty')}>{ku.projPct >= 1 ? t.kuOver(eur0(ku.proj)) : t.kuHeadroom(eur0(ku.limit - ku.proj))}</span>
        </div>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:10px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.lowStock}</span>
            <button onClick={() => go('products')} style={sx('border:0;background:transparent;color:#A9BCFF;font-size:13px;cursor:pointer')}>
              {t.productsLink}
            </button>
          </div>
          {low.map((x) => {
            const tone = x.q === 0 ? 'red' : 'amber';
            const waiting = x.p.waitlist[x.size] ?? 0;
            return (
              <div key={x.p.id + x.size} style={sx('display:flex;align-items:center;gap:10px')}>
                <Thumb productId={x.p.id} size={34} radius={8} />
                <span style={sx('flex:1;min-width:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
                  {shortName(x.p.name)} <span style={sx('color:#6B727D')}>· {x.size}</span>
                </span>
                <span style={{ ...sx('font-size:12px;font-weight:600;padding:3px 9px;border-radius:20px;white-space:nowrap'), background: TONE[tone][0], color: TONE[tone][1] }}>
                  {x.q === 0 ? t.soldOut + (waiting ? ' · ' + t.waiting(waiting) : '') : t.left(x.q)}
                </span>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
