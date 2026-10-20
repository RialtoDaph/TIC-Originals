'use client';

import { useEffect, useState } from 'react';
import { berlinDay } from '@/lib/owner/derive';
import type { SiteSettings } from '@/lib/types';
import { saveNotif, saveSettings, testNotification, type SettingsDraft } from '@/app/owner/actions';
import { useOwner } from '../OwnerContext';
import { sx } from '../sx';
import { S, ToggleTrack } from '../ui';

const dec = (cents: number) => (cents / 100).toFixed(2).replace(/\.00$/, '');

function toDraft(s: SiteSettings): SettingsDraft {
  const pad3 = (a: string[]) => [...a, '', '', ''].slice(0, 3);
  return {
    freeShip: dec(s.freeShipCents),
    shipDe: dec(s.shipDeCents),
    shipIntl: dec(s.shipIntlCents),
    usdRate: String(s.usdRate),
    popup: s.popupEnabled,
    popupCode: s.popupCode,
    popupPct: String(s.popupPct),
    popupUntil: s.popupUntil,
    annL: pad3(s.annLeft),
    annR: pad3(s.annRight),
  };
}

export function SettingsTab() {
  const { data, t, now, run, busy, toast } = useOwner();
  const saved = toDraft(data.settings);
  const [draft, setDraft] = useState<SettingsDraft>(saved);
  const [notif, setNotif] = useState(data.notif);
  const savedKey = JSON.stringify(saved);
  // After a save the server data refreshes: show the normalised saved values again.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the form with fresh server data
    setDraft(JSON.parse(savedKey));
  }, [savedKey]);
  const dirty = JSON.stringify(draft) !== savedKey;
  const set = <K extends keyof SettingsDraft>(k: K, v: SettingsDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const persistNotif = (n: typeof notif) => {
    setNotif(n);
    void saveNotif(n);
  };

  const field = (k: 'freeShip' | 'shipDe' | 'shipIntl' | 'usdRate' | 'popupCode' | 'popupPct' | 'popupUntil', label: string) => (
    <label key={k} style={S.label}>
      <span style={S.labelText}>{label}</span>
      <input value={draft[k]} onChange={(e) => set(k, e.target.value)} inputMode={k === 'popupCode' || k === 'popupUntil' ? undefined : 'decimal'} style={S.input} />
    </label>
  );

  const today = berlinDay(now);
  const log = data.activity.filter((a) => berlinDay(a.at) === today);
  const time = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div style={sx('display:flex;align-items:center;gap:12px;flex-wrap:wrap')}>
        <h1 style={S.h1}>{t.tabs.settings}</h1>
        {dirty && (
          <>
            <span style={sx('font-size:13px;color:#F2B544')}>{t.unsaved}</span>
            <button onClick={() => setDraft(saved)} style={S.neutralBtn}>
              {t.discard}
            </button>
          </>
        )}
        <button
          disabled={!dirty || busy}
          onClick={() => run(() => saveSettings(draft), t.toast.saved)}
          style={{ ...sx('height:38px;padding:0 18px;border:0;border-radius:10px;font-size:13px;font-weight:600'), background: dirty ? '#7C9CFF' : '#2A2E36', color: dirty ? '#0E1220' : '#6B727D', cursor: dirty ? 'pointer' : 'default', opacity: 1 }}
        >
          {t.saveChanges}
        </button>
      </div>
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px')}>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px')}>
          <span style={sx('font-size:15px;font-weight:600')}>{t.storeShipping}</span>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')}>
            {field('freeShip', t.sf.freeShip)}
            {field('shipDe', t.sf.shipDe)}
            {field('shipIntl', t.sf.shipIntl)}
            {field('usdRate', t.sf.usdRate)}
          </div>
        </div>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.popup}</span>
            <button onClick={() => set('popup', !draft.popup)} aria-pressed={draft.popup} aria-label={t.popup} style={sx('display:flex;align-items:center;gap:10px;border:0;background:transparent;color:#9AA1AC;font-size:13px;cursor:pointer;padding:0')}>
              {draft.popup ? t.on : t.off}
              <ToggleTrack on={draft.popup} />
            </button>
          </div>
          <div style={sx('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px')}>
            {field('popupCode', t.pf.code)}
            {field('popupPct', t.pf.pct)}
            {field('popupUntil', t.pf.until)}
          </div>
        </div>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px')}>
          <span style={sx('font-size:15px;font-weight:600')}>{t.notifications}</span>
          {(
            [
              ['tg', 'Telegram', 'tgId', t.tgPh],
              ['wa', 'WhatsApp', 'waNo', '+49 …'],
            ] as const
          ).map(([k, label, f, ph]) => (
            <div key={k} style={sx('display:flex;align-items:center;gap:12px')}>
              <span style={sx('flex:1;display:flex;flex-direction:column;gap:6px;min-width:0')}>
                <span style={sx('font-size:14px')}>{label}</span>
                <input value={notif[f]} placeholder={ph} aria-label={label} onChange={(e) => setNotif({ ...notif, [f]: e.target.value })} onBlur={() => persistNotif(notif)} style={sx('height:36px;padding:0 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#14161A;color:#ECEEF1;font-size:13px;outline:none;box-sizing:border-box;min-width:0')} />
              </span>
              <button onClick={() => persistNotif({ ...notif, [k]: !notif[k] })} aria-pressed={notif[k]} aria-label={label} style={sx('display:flex;align-items:center;gap:10px;border:0;background:transparent;color:#9AA1AC;font-size:13px;cursor:pointer;padding:0;align-self:flex-end;height:36px')}>
                {notif[k] ? t.on : t.off}
                <ToggleTrack on={notif[k]} />
              </button>
            </div>
          ))}
          <div style={sx('display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06)')}>
            <span style={sx('font-size:12px;color:#9AA1AC')}>{t.notifyAbout}</span>
            <div style={sx('display:flex;gap:6px;flex-wrap:wrap')}>
              {(['order', 'stock', 'refund', 'drop'] as const).map((k) => {
                const on = notif.events.includes(k);
                return (
                  <button key={k} aria-pressed={on} onClick={() => persistNotif({ ...notif, events: on ? notif.events.filter((x) => x !== k) : [...notif.events, k] })} style={{ ...sx('height:32px;padding:0 12px;border:0;border-radius:16px;font-size:13px;cursor:pointer;white-space:nowrap'), background: on ? 'rgba(124,156,255,.16)' : '#23272E', color: on ? '#A9BCFF' : '#9AA1AC' }}>
                    {(on ? '✓ ' : '') + t.events[k]}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            disabled={busy}
            onClick={async () => {
              if (!notif.tg && !notif.wa) return toast(t.toast.turnOn);
              await saveNotif(notif);
              const r = await testNotification();
              if (!r.ok || !r.result) return toast(t.toast.failed);
              const sent = [r.result.telegram === 'sent' && 'Telegram'].filter(Boolean) as string[];
              const msgs = [sent.length ? t.toast.test(sent.join(' + ')) : '', r.result.telegram === 'not_configured' ? t.toast.tgMissing : '', r.result.telegram === 'failed' ? t.toast.failed : '', r.result.whatsapp === 'not_supported' ? t.toast.waTodo : ''].filter(Boolean);
              toast(msgs.join(' · ') || t.toast.failed);
            }}
            style={sx('align-self:flex-start;height:34px;padding:0 14px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:13px;font-weight:500;cursor:pointer')}
          >
            {t.testMsg}
          </button>
        </div>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:6px 0 8px')}>
          <div style={sx('display:flex;justify-content:space-between;align-items:center;padding:12px 18px')}>
            <span style={sx('font-size:15px;font-weight:600')}>{t.activity}</span>
            <span style={sx('font-size:12px;color:#6B727D')}>{t.thisSession}</span>
          </div>
          {log.map((l) => (
            <div key={l.id} style={sx('display:flex;gap:12px;padding:9px 18px;border-top:1px solid rgba(255,255,255,.04);font-size:13px')}>
              <span style={sx("font-family:'DM Mono',monospace;font-size:12px;color:#6B727D;flex-shrink:0")}>{time(l.at)}</span>
              <span style={sx('flex:1;color:#C4C8CF')}>{l.text}</span>
              <span style={sx('font-size:12px;color:#6B727D')}>{t.you}</span>
            </div>
          ))}
          {log.length === 0 && <div style={sx('padding:24px 18px;font-size:13px;color:#6B727D')}>{t.noLog}</div>}
        </div>
        <div style={sx('background:#1C1F25;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;grid-column:1/-1')}>
          <span style={sx('font-size:15px;font-weight:600')}>{t.announcement}</span>
          <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px')}>
            {(['annL', 'annR'] as const).flatMap((side) =>
              draft[side].map((v, i) => (
                <label key={side + i} style={S.label}>
                  <span style={S.labelText}>{side === 'annL' ? t.leftMsg(i + 1) : t.rightMsg(i + 1)}</span>
                  <input
                    value={v}
                    onChange={(e) => {
                      const a = [...draft[side]];
                      a[i] = e.target.value;
                      set(side, a);
                    }}
                    style={S.input}
                  />
                </label>
              )),
            )}
          </div>
        </div>
      </div>
    </>
  );
}
