'use client';

import { useEffect, useRef, useState } from 'react';
import { berlinDay, customerStats, DAY, orderHeat, shortName } from '@/lib/owner/derive';
import { deleteCode, saveDrop, sendCartReminders, sendVipCode, setBundleActive, setCodeActive } from '@/app/owner/actions';
import { useOwner } from '../OwnerContext';
import { sx } from '../sx';
import { S, Thumb, Toggle, ToggleTrack } from '../ui';
import { ago } from '../useTasks';
import { bestLabel } from './InsightsTab';

const berlinTime = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });

/** Wall-clock Berlin date+time → epoch ms (for the preview countdown). */
function berlinEpoch(date: string, time: string) {
  const guess = new Date(`${date}T${time}:00Z`).getTime();
  const asBerlin = new Date(new Date(guess).toLocaleString('en-US', { timeZone: 'Europe/Berlin' })).getTime();
  const asUtc = new Date(new Date(guess).toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  return guess - (asBerlin - asUtc);
}

export function PromoTab({ countdown }: { countdown: string }) {
  const { data, t, lang, now, run, eur, eur0, busy, setUi } = useOwner();
  const drop = data.drops[0];
  const [d, setD] = useState(() => ({
    name: drop?.name ?? '',
    date: drop ? berlinDay(drop.liveAt) : berlinDay(new Date(now.getTime() + 7 * DAY)),
    time: drop ? berlinTime(drop.liveAt) : '18:00',
    lock: drop?.lockShop ?? false,
  }));
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(saveTimer.current), []);
  const persist = (next: typeof d, msg = t.toast.dropSaved, delay = 600) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (next.name.trim() && next.date && next.time) void run(() => saveDrop({ id: drop?.id, ...next }), msg);
    }, delay);
  };
  const update = (patch: Partial<typeof d>, immediate = false) => {
    const next = { ...d, ...patch };
    setD(next);
    persist(next, t.toast.dropSaved, immediate ? 0 : 900);
  };

  const { peak } = orderHeat(data.orders, now);
  const best = bestLabel(peak.day, peak.hour, lang);
  const target = d.date && d.time ? berlinEpoch(d.date, d.time) : 0;
  const diff = target - now.getTime();
  const preview =
    diff > 0
      ? `${Math.floor(diff / DAY)}d ${String(Math.floor((diff % DAY) / 36e5)).padStart(2, '0')}h ${String(Math.floor((diff % 36e5) / 6e4)).padStart(2, '0')}m`
      : countdown;
  const when = target ? new Date(target).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' }) + ` · ${d.time} ${t.oClock}` : '';

  // Repeat customers (2+ orders)
  const byEmail = new Map<string, number>();
  data.orders.forEach((o) => byEmail.set(o.email.toLowerCase(), (byEmail.get(o.email.toLowerCase()) ?? 0) + 1));
  const repeats = [...byEmail.entries()]
    .filter(([, n]) => n > 1)
    .map(([email]) => ({ email, ...customerStats(data.orders, email) }))
    .sort((a, b) => b.n - a.n || b.spent - a.spent)
    .slice(0, 10);

  const [armed, setArmed] = useState<string | null>(null);

  return (
    <>
      <h1 style={sx('margin:0;font-size:26px;font-weight:600;letter-spacing:-.01em')}>{t.tabs.promo}</h1>
      <div style={sx('background:#1C1F25;border-radius:16px;display:flex;flex-wrap:wrap;overflow:hidden')}>
        <div style={sx('flex:1 1 400px;padding:18px;display:flex;flex-direction:column;gap:16px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:baseline;gap:12px')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.dropSchedule}</span>
            <span style={sx('font-size:12px;color:#6B727D')}>{t.dropNote}</span>
          </div>
          <div style={sx('display:grid;grid-template-columns:90px minmax(0,1fr) 120px;gap:10px')}>
            <label style={S.label}>
              <span style={S.labelText}>{t.drop}</span>
              <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} onBlur={() => persist(d, t.toast.dropSaved, 0)} style={S.input} />
            </label>
            <label style={S.label}>
              <span style={S.labelText}>{t.date}</span>
              <input type="date" value={d.date} onChange={(e) => update({ date: e.target.value })} style={S.input} />
            </label>
            <label style={S.label}>
              <span style={S.labelText}>{t.time}</span>
              <input type="time" value={d.time} onChange={(e) => update({ time: e.target.value })} style={S.input} />
            </label>
          </div>
          <button
            disabled={busy}
            onClick={() => {
              // Next occurrence (from tomorrow) of the weekday/hour with the most orders.
              let n = 1;
              while ((new Date(now.getTime() + n * DAY).getUTCDay() + 6) % 7 !== peak.day) n++;
              const date = berlinDay(new Date(now.getTime() + n * DAY));
              const time = String(peak.hour).padStart(2, '0') + ':00';
              const next = { ...d, date, time };
              setD(next);
              persist(next, t.toast.dropMoved(best), 0);
            }}
            style={sx('align-self:flex-start;height:34px;padding:0 14px;border:0;border-radius:10px;background:rgba(124,156,255,.14);color:#A9BCFF;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap')}
          >
            {t.useBest(best)}
          </button>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:14px;border-top:1px solid rgba(255,255,255,.06)')}>
            <div style={sx('display:flex;flex-direction:column;gap:3px')}>
              <span style={sx('font-size:14px')}>{t.lockShop}</span>
              <span style={sx('font-size:12px;color:#9AA1AC')}>{t.lockNote}</span>
            </div>
            <button onClick={() => update({ lock: !d.lock }, true)} aria-pressed={d.lock} aria-label={t.lockShop} style={sx('display:flex;align-items:center;gap:10px;border:0;background:transparent;color:#9AA1AC;font-size:13px;cursor:pointer;padding:0')}>
              {d.lock ? t.on : t.off}
              <ToggleTrack on={d.lock} />
            </button>
          </div>
        </div>
        <div style={sx('flex:1 1 300px;background:#0F1114;padding:28px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center')}>
          <span style={sx('font-size:12px;color:#6B727D')}>{t.shopPreview}</span>
          <span style={sx('font-size:30px;font-weight:700;letter-spacing:-.01em')}>Drop {d.name}</span>
          <span style={sx("font-family:'DM Mono',monospace;font-size:24px;color:#A9BCFF")}>{preview}</span>
          <span style={sx('font-size:13px;color:#9AA1AC')}>{when}</span>
        </div>
      </div>
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px')}>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:6px 0 8px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;padding:12px 18px')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.abandoned(eur(data.carts.reduce((a, c) => a + c.valueCents, 0)))}</span>
            <button
              disabled={busy}
              onClick={() => {
                const ids = data.carts.filter((c) => !c.reminded).map((c) => c.id);
                if (ids.length) void run(() => sendCartReminders(ids, 'carts'), t.toast.carts(ids.length));
              }}
              style={S.linkBtn}
            >
              {t.remindAll}
            </button>
          </div>
          {data.carts.map((c) => (
            <div key={c.id} style={sx('display:flex;align-items:center;gap:12px;padding:10px 18px;border-top:1px solid rgba(255,255,255,.04)')}>
              <Thumb productId={c.items[0]?.productId ?? null} size={36} radius={8} />
              <span style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:2px')}>
                <span style={sx('font-size:14px')}>
                  {c.name} <span style={sx('font-size:12px;color:#6B727D')}>· {t.task.ago(ago(c.createdAt, now))}</span>
                </span>
                <span style={sx('font-size:12px;color:#9AA1AC;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{c.items.map((i) => `${shortName(i.name)} · ${i.size}`).join(' + ')}</span>
              </span>
              <span style={sx("font-family:'DM Mono',monospace;font-size:13px")}>{eur(c.valueCents)}</span>
              <button disabled={busy || c.reminded} onClick={() => run(() => sendCartReminders([c.id], null), t.toast.carts(1))} style={{ ...sx('height:32px;padding:0 12px;border:0;border-radius:9px;background:#2A2E36;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap'), color: c.reminded ? '#4ED29A' : '#ECEEF1', opacity: 1 }}>
                {c.reminded ? t.sentCheck : t.sendReminder}
              </button>
            </div>
          ))}
          {data.carts.length === 0 && <div style={sx('padding:10px 18px 14px;font-size:13px;color:#6B727D')}>{t.noCarts}</div>}
        </div>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:6px 0 8px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;padding:12px 18px')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.repeatCustomers}</span>
            <span style={sx('font-size:12px;color:#6B727D')}>{t.vipNote(20)}</span>
          </div>
          {repeats.map((c) => {
            const sent = data.vipSent.includes(c.email);
            return (
              <div key={c.email} style={sx('display:flex;align-items:center;gap:12px;padding:10px 18px;border-top:1px solid rgba(255,255,255,.04)')}>
                <span style={sx('width:36px;height:36px;border-radius:50%;background:#2A2E36;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0')}>
                  {c.name
                    .split(' ')
                    .map((x) => x[0])
                    .join('')
                    .slice(0, 2)}
                </span>
                <span style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:2px')}>
                  <span style={sx('font-size:14px')}>{c.name}</span>
                  <span style={sx('font-size:12px;color:#9AA1AC')}>{t.repeatStats(c.n, eur(c.spent), c.size)}</span>
                </span>
                <button disabled={busy || sent} onClick={() => run(() => sendVipCode(c.email, c.name), t.toast.vip('VIP20', c.name))} style={{ ...sx('height:32px;padding:0 12px;border:0;border-radius:9px;background:#2A2E36;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap'), color: sent ? '#4ED29A' : '#ECEEF1', opacity: 1 }}>
                  {sent ? t.codeSent : t.sendVip}
                </button>
              </div>
            );
          })}
          {repeats.length === 0 && <div style={sx('padding:10px 18px 14px;font-size:13px;color:#6B727D')}>{t.noRepeat}</div>}
        </div>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:6px 0 8px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;padding:12px 18px')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.discountCodes}</span>
            <button onClick={() => setUi({ modal: { kind: 'code', draft: { code: '', pct: true, value: '', min: '0', until: '', limit: '', first: false } }, modalErr: '' })} style={S.linkBtn}>
              {t.newCode}
            </button>
          </div>
          {data.codes.map((c) => {
            const isArmed = armed === c.code;
            const meta = [
              c.minOrderCents ? t.minOrder(eur0(c.minOrderCents)) : t.noMin,
              c.validUntil ? t.until(c.validUntil.split('-').reverse().join('.')) : t.noEnd,
              t.used(c.usedCount, c.usageLimit),
              c.firstOrderOnly ? t.firstOnly : '',
            ].filter(Boolean);
            return (
              <div key={c.code} style={sx('display:flex;align-items:center;gap:12px;padding:10px 18px;border-top:1px solid rgba(255,255,255,.04)')}>
                <span style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:3px')}>
                  <span style={sx('display:flex;gap:10px;align-items:baseline')}>
                    <span style={sx("font-family:'DM Mono',monospace;font-size:14px;font-weight:500")}>{c.code}</span>
                    <span style={sx('font-size:14px;font-weight:600;color:#A9BCFF')}>{c.isPercent ? '−' + c.value + '%' : '−' + eur(Math.round(c.value * 100))}</span>
                  </span>
                  <span style={sx('font-size:12px;color:#9AA1AC')}>{meta.join(' · ')}</span>
                </span>
                <Toggle on={c.active} label={`${c.code} on/off`} disabled={busy} onClick={() => run(() => setCodeActive(c.code, !c.active), `${c.code}: ${c.active ? t.off : t.on}`)} />
                <button
                  disabled={busy}
                  onClick={() => {
                    if (!isArmed) return setArmed(c.code);
                    setArmed(null);
                    void run(() => deleteCode(c.code), t.toast.codeDeleted(c.code));
                  }}
                  onBlur={() => isArmed && setArmed(null)}
                  style={{ ...sx('height:30px;padding:0 10px;border:0;border-radius:8px;font-size:12px;cursor:pointer;white-space:nowrap'), background: isArmed ? '#FF6B5E' : 'transparent', color: isArmed ? '#14161A' : '#6B727D' }}
                >
                  {isArmed ? t.confirmDel : t.del}
                </button>
              </div>
            );
          })}
        </div>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:6px 0 8px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;padding:12px 18px')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.bundles}</span>
            <button onClick={() => setUi({ modal: { kind: 'bundle', draft: { name: '', summary: '', normal: '', price: '' } }, modalErr: '' })} style={S.linkBtn}>
              {t.newBundle}
            </button>
          </div>
          {data.bundles.map((b) => (
            <div key={b.id} style={sx('display:flex;align-items:center;gap:12px;padding:10px 18px;border-top:1px solid rgba(255,255,255,.04)')}>
              <span style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:3px')}>
                <span style={sx('font-size:14px;font-weight:600')}>{b.name}</span>
                <span style={sx('font-size:12px;color:#9AA1AC')}>{b.summary}</span>
              </span>
              <span style={sx('display:flex;flex-direction:column;align-items:flex-end;gap:1px')}>
                <span style={sx("font-family:'DM Mono',monospace;font-size:11px;color:#6B727D;text-decoration:line-through")}>{eur(b.normalCents)}</span>
                <span style={sx("font-family:'DM Mono',monospace;font-size:14px")}>{eur(b.priceCents)}</span>
              </span>
              <Toggle on={b.active} label={`${b.name} on/off`} disabled={busy} onClick={() => run(() => setBundleActive(b.id, !b.active), `${b.name}: ${b.active ? t.off : t.on}`)} />
            </div>
          ))}
          <div style={sx('padding:10px 18px 6px;font-size:12px;color:#6B727D')}>{t.bundleNote}</div>
        </div>
      </div>
    </>
  );
}
