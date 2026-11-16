'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createReceiptUpload, saveExpense, voidExpense } from '@/app/owner/finance-actions';
import { deDec, financeLedger, financeSummary, parseEuroCents, toCsv } from '@/lib/owner/derive';
import { EXPENSE_CATEGORIES, type ExpenseCategory, type OExpense } from '@/lib/owner/types';
import { MONTHS_DE } from '@/i18n/owner';
import { useOwner } from '../OwnerContext';
import { sx } from '../sx';
import { download } from './OrdersTab';

const RED = '#FF6B5E';
const GREEN = '#4ED29A';
const MONO = "font-family:'DM Mono',monospace";
const inputStyle = sx('height:42px;padding:0 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#14161A;color:#ECEEF1;font-size:14px;outline:none;box-sizing:border-box;min-width:0;width:100%');
const selectStyle = sx('height:36px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#14161A;color:#ECEEF1;font-size:13px;outline:none');
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const MAX_BYTES = 10 * 1024 * 1024;

const tone = (cents: number) => (cents < 0 ? RED : cents > 0 ? GREEN : '#ECEEF1');
const monthLabel = (ym: string) => `${MONTHS_DE[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

interface Draft {
  id?: string;
  paidOn: string;
  category: ExpenseCategory;
  vendor: string;
  invoiceNo: string;
  description: string;
  amount: string;
  receipts: OExpense['receipts'];
}

export function FinanceTab() {
  const { data, t, now, eur, run } = useOwner();
  const f = t.fin;
  const [year, setYear] = useState('all');
  const [cat, setCat] = useState<'all' | ExpenseCategory>('all');
  const [draft, setDraft] = useState<Draft | null>(null);

  if (!data.financeReady) {
    return <div style={sx('background:#1C1F25;border-radius:16px;padding:22px;font-size:14px;line-height:1.5;color:#FFC857')}>{f.notReady}</div>;
  }

  const sum = financeSummary(data.financeOrders, data.expenses, now);
  const years = [...new Set(data.expenses.map((e) => e.paidOn.slice(0, 4)))].sort().reverse();
  const listed = data.expenses.filter((e) => (year === 'all' || e.paidOn.startsWith(year)) && (cat === 'all' || e.category === cat));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);

  const exportLedger = () =>
    download(
      f.csvName(today),
      toCsv([
        ['Datum', 'Art', 'Kategorie', 'Lieferant / Bestellung', 'Beschreibung', 'Rechnungsnr.', 'Betrag EUR (Einnahme +, Ausgabe −)', 'Beleg'],
        ...financeLedger(data.financeOrders, data.expenses, (c) => f.cat[c]).map((r) => [r.date, r.kind, r.category, r.who, r.text, r.invoiceNo, deDec(r.cents), r.receipt]),
        ['Summe', '', '', '', '', '', deDec(sum.allTime.result), ''],
        ['Hinweis: Kassenergebnis nach Zahlungsdatum, keine Umsatzsteuer gemäß § 19 UStG'],
      ]),
    );

  const card = (label: string, v: { income: number; expenses: number; result: number }, big = false) => (
    <div style={{ ...sx('background:#1C1F25;border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:6px;flex:1 1 220px;min-width:0'), ...(big ? { outline: '1px solid rgba(255,255,255,.1)' } : {}) }}>
      <span style={sx('font-size:13px;color:#9AA1AC')}>{label}</span>
      <span style={{ ...sx(`${MONO};font-size:${big ? 30 : 24}px;font-weight:500`), color: tone(v.result) }}>{eur(v.result)}</span>
      <span style={sx('font-size:12px;color:#6B727D;display:flex;gap:14px;flex-wrap:wrap')}>
        <span>
          {f.income} <span style={sx(MONO)}>{eur(v.income)}</span>
        </span>
        <span>
          {f.expenses} <span style={sx(MONO)}>{eur(v.expenses)}</span>
        </span>
      </span>
    </div>
  );

  // Running total chart: one point per month, zero line visible even when everything is negative.
  const pts = sum.months;
  const W = 760;
  const H = 150;
  const vals = pts.map((p) => p.cumulative).concat(0);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i: number) => (pts.length < 2 ? W / 2 : 16 + (i * (W - 32)) / (pts.length - 1));
  const y = (v: number) => 12 + ((hi - v) * (H - 24)) / span;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`).join(' ');

  return (
    <>
      <div style={sx('display:flex;gap:14px;flex-wrap:wrap')}>
        {card(f.scopes.all, sum.allTime, true)}
        {card(f.scopes.year, sum.year)}
        {card(f.scopes.month, sum.month)}
      </div>

      <div style={sx('background:#1C1F25;border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:10px')}>
        <span style={sx('font-size:15px;font-weight:600')}>{f.chart}</span>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={f.chart} style={sx('width:100%;height:auto;display:block')}>
          <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,.18)" strokeDasharray="4 4" />
          <path d={line} fill="none" stroke="#7C9CFF" strokeWidth="2.5" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle key={p.month} cx={x(i)} cy={y(p.cumulative)} r="3.5" fill={p.cumulative < 0 ? RED : GREEN} />
          ))}
        </svg>
        <div style={sx('overflow-x:auto')}>
          <div style={sx('min-width:560px;display:grid;grid-template-columns:minmax(0,1.2fr) repeat(4,minmax(0,1fr));gap:12px;padding:6px 0;font-size:12px;color:#6B727D')}>
            <span>{f.monthHead.month}</span>
            <span style={sx('text-align:right')}>{f.monthHead.income}</span>
            <span style={sx('text-align:right')}>{f.monthHead.expenses}</span>
            <span style={sx('text-align:right')}>{f.monthHead.result}</span>
            <span style={sx('text-align:right')}>{f.monthHead.cumulative}</span>
          </div>
          {[...pts].reverse().map((p) => (
            <div key={p.month} style={sx('min-width:560px;display:grid;grid-template-columns:minmax(0,1.2fr) repeat(4,minmax(0,1fr));gap:12px;padding:8px 0;border-top:1px solid rgba(255,255,255,.04);font-size:13px')}>
              <span>{monthLabel(p.month)}</span>
              <span style={sx(`${MONO};text-align:right`)}>{eur(p.income)}</span>
              <span style={sx(`${MONO};text-align:right`)}>{eur(p.expenses)}</span>
              <span style={{ ...sx(`${MONO};text-align:right`), color: tone(p.result) }}>{eur(p.result)}</span>
              <span style={{ ...sx(`${MONO};text-align:right;font-weight:600`), color: tone(p.cumulative) }}>{eur(p.cumulative)}</span>
            </div>
          ))}
        </div>
        {sum.undatedRefunds > 0 && <span style={sx('font-size:12px;color:#FFC857')}>{f.undatedRefunds(sum.undatedRefunds)}</span>}
        <span style={sx('font-size:12px;color:#6B727D;line-height:1.5')}>{f.disclaimer}</span>
      </div>

      <div style={sx('background:#1C1F25;border-radius:16px;padding:6px 0 8px')}>
        <div style={sx('display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 18px')}>
          <span style={sx('font-size:15px;font-weight:600;display:flex;gap:10px;align-items:center;flex-wrap:wrap')}>
            {f.list}
            {sum.withoutReceipt > 0 && <span style={{ ...sx('font-size:12px;font-weight:500;padding:3px 9px;border-radius:20px'), background: 'rgba(255,200,87,.14)', color: '#FFC857' }}>{f.withoutReceipt(sum.withoutReceipt)}</span>}
          </span>
          <span style={sx('display:flex;gap:8px;flex-wrap:wrap;align-items:center')}>
            <select aria-label={f.allYears} value={year} onChange={(e) => setYear(e.target.value)} style={selectStyle}>
              <option value="all">{f.allYears}</option>
              {years.map((y2) => (
                <option key={y2} value={y2}>
                  {y2}
                </option>
              ))}
            </select>
            <select aria-label={f.allCats} value={cat} onChange={(e) => setCat(e.target.value as 'all' | ExpenseCategory)} style={selectStyle}>
              <option value="all">{f.allCats}</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {f.cat[c]}
                </option>
              ))}
            </select>
            <button onClick={exportLedger} style={sx('height:36px;padding:0 14px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap')}>
              {f.csv}
            </button>
            <button onClick={() => setDraft({ paidOn: today, category: 'production', vendor: '', invoiceNo: '', description: '', amount: '', receipts: [] })} style={sx('height:36px;padding:0 14px;border:0;border-radius:10px;background:#7C9CFF;color:#0E1220;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap')}>
              + {f.add}
            </button>
          </span>
        </div>
        {listed.length === 0 && <div style={sx('padding:36px 18px;text-align:center;font-size:14px;color:#6B727D')}>{f.empty}</div>}
        {listed.map((e) => (
          <div key={e.id} style={sx('display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:11px 18px;border-top:1px solid rgba(255,255,255,.04);font-size:13px')}>
            <button
              onClick={() => setDraft({ id: e.id, paidOn: e.paidOn, category: e.category, vendor: e.vendor, invoiceNo: e.invoiceNo, description: e.description, amount: deDec(e.amountCents), receipts: e.receipts })}
              style={sx('background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;text-align:left;cursor:pointer;display:flex;gap:12px;align-items:center;flex-wrap:wrap;flex:1 1 320px;min-width:0')}
              aria-label={`${f.edit}: ${e.vendor || f.cat[e.category]}`}
            >
              <span style={sx(`${MONO};color:#9AA1AC;width:84px`)}>{e.paidOn.split('-').reverse().join('.')}</span>
              <span style={sx('flex:1 1 160px;min-width:0;display:flex;flex-direction:column;gap:2px')}>
                <span style={sx('font-weight:500')}>{e.vendor || '—'}</span>
                <span style={sx('font-size:12px;color:#6B727D;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>
                  {f.cat[e.category]}
                  {e.description ? ` · ${e.description}` : ''}
                </span>
              </span>
              <span style={{ ...sx(`${MONO};min-width:90px;text-align:right`), color: e.amountCents < 0 ? GREEN : '#ECEEF1' }}>{eur(-e.amountCents)}</span>
            </button>
            <span style={sx('display:flex;gap:8px;align-items:center;min-width:120px;justify-content:flex-end')}>
              {e.paidOn > today && <span style={{ ...sx('font-size:12px;padding:3px 9px;border-radius:20px'), background: 'rgba(124,156,255,.14)', color: '#7C9CFF' }}>{f.planned}</span>}
              {e.receipts.length === 0 && <span style={{ ...sx('font-size:12px;padding:3px 9px;border-radius:20px'), background: 'rgba(255,200,87,.14)', color: '#FFC857' }}>{f.noReceipt}</span>}
              {e.receipts.map((r, i) => (
                <a key={r.id} href={`/owner/receipt/${r.id}`} target="_blank" rel="noreferrer" title={r.name || f.openReceipt} aria-label={`${f.openReceipt}: ${e.vendor || f.cat[e.category]} ${e.paidOn}${e.receipts.length > 1 ? ` (${i + 1})` : ''}`} style={sx('font-size:12px;color:#7C9CFF;text-decoration:underline;text-underline-offset:3px')}>
                  {f.openReceipt}
                  {e.receipts.length > 1 ? ` ${i + 1}` : ''}
                </a>
              ))}
            </span>
          </div>
        ))}
      </div>

      {draft && (
        <ExpenseModal
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={() => setDraft(null)}
          onVoid={async (id) => {
            if (await run(() => voidExpense(id), f.voided)) setDraft(null);
          }}
        />
      )}
    </>
  );
}

function ExpenseModal({ draft, onClose, onSaved, onVoid }: { draft: Draft; onClose: () => void; onSaved: () => void; onVoid: (id: string) => void }) {
  const { t, toast, eur, now } = useOwner();
  const f = t.fin;
  const [d, setD] = useState(draft);
  const [file, setFile] = useState<File | null>(null);
  // A receipt that is already in storage but not yet attached (the save failed): reused on retry instead of uploading again.
  const uploaded = useRef<{ file: File; path: string; mime: string; name: string } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const parsed = parseEuroCents(d.amount);
  const maxDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date(now.getTime() + 366 * 864e5));

  useEffect(() => first.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function pick(files: FileList | null) {
    const picked = files?.[0];
    // Reset so choosing the same file again after an error still fires onChange.
    if (input.current) input.current.value = '';
    if (!picked) return;
    setErr('');
    if (!ACCEPT.split(',').includes(picked.type)) return setErr(f.err.type);
    if (picked.size > MAX_BYTES) return setErr(f.err.size);
    uploaded.current = null;
    setFile(picked);
  }

  async function save() {
    setErr('');
    if (parsed === null) return setErr(f.err.amount);
    setBusy(true);
    try {
      let receipt: { path: string; mime: string; name: string } | undefined;
      if (file) {
        if (uploaded.current?.file !== file) {
          // Straight to storage with a one-time token from the server: the file never passes through a function.
          const up = await createReceiptUpload({ mime: file.type, size: file.size });
          if (!up.ok) return setErr(f.err[up.error as keyof typeof f.err] ?? f.err.failed);
          const { path, token } = up.data as { path: string; token: string };
          const { error } = await createClient().storage.from('receipts').uploadToSignedUrl(path, token, file, { contentType: file.type });
          if (error) return setErr(f.err.receipt);
          uploaded.current = { file, path, mime: file.type, name: file.name };
        }
        receipt = { path: uploaded.current.path, mime: uploaded.current.mime, name: uploaded.current.name };
      }
      const r = await saveExpense({ id: d.id, paidOn: d.paidOn, category: d.category, vendor: d.vendor, invoiceNo: d.invoiceNo, description: d.description, amount: d.amount, receipt });
      if (!r.ok) return setErr(f.err[r.error as keyof typeof f.err] ?? f.err.failed);
      toast(f.saved);
      onSaved();
    } catch {
      setErr(f.err.failed);
    } finally {
      setBusy(false);
    }
  }

  const label = (text: string, child: React.ReactNode, hint?: string) => (
    <label style={sx('display:flex;flex-direction:column;gap:6px;font-size:12px;color:#9AA1AC')}>
      {text}
      {child}
      {hint && <span style={sx('color:#6B727D')}>{hint}</span>}
    </label>
  );

  return (
    <>
      <div onClick={onClose} style={sx('position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.5)')} />
      <div role="dialog" aria-modal="true" aria-label={d.id ? f.edit : f.add} style={sx('position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:41;width:560px;max-width:calc(100% - 32px);max-height:calc(100vh - 48px);overflow-y:auto;background:#1C1F25;border-radius:18px;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.5)')}>
        <div style={sx('padding:20px 22px;display:flex;justify-content:space-between;align-items:center')}>
          <span style={sx('font-size:20px;font-weight:600')}>{d.id ? f.edit : f.add}</span>
          <button onClick={onClose} aria-label={t.close} style={sx('width:36px;height:36px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:18px;cursor:pointer')}>
            ×
          </button>
        </div>
        <div style={sx('padding:0 22px 8px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px')}>
          {label(f.form.date, <input ref={first} type="date" min="2000-01-01" max={maxDate} value={d.paidOn} onChange={(e) => set('paidOn', e.target.value)} style={inputStyle} />)}
          {label(
            f.form.category,
            <select value={d.category} onChange={(e) => set('category', e.target.value as ExpenseCategory)} style={inputStyle}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {f.cat[c]}
                </option>
              ))}
            </select>,
          )}
          {label(f.form.vendor, <input value={d.vendor} onChange={(e) => set('vendor', e.target.value)} maxLength={120} style={inputStyle} />)}
          {label(f.form.invoiceNo, <input value={d.invoiceNo} onChange={(e) => set('invoiceNo', e.target.value)} maxLength={80} style={inputStyle} />)}
          {label(f.form.amount, <input inputMode="decimal" value={d.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0,00" style={{ ...inputStyle, ...sx(MONO) }} />, parsed !== null ? f.parsed(eur(-parsed)) : f.form.amountHint)}
          {label(f.form.description, <input value={d.description} onChange={(e) => set('description', e.target.value)} maxLength={500} style={inputStyle} />)}
          <div style={sx('grid-column:1 / -1;display:flex;flex-direction:column;gap:8px')}>
            <span style={sx('font-size:12px;color:#9AA1AC')}>{f.form.receipt}</span>
            {d.receipts.map((r, i) => (
              <a key={r.id} href={`/owner/receipt/${r.id}`} target="_blank" rel="noreferrer" style={sx('font-size:13px;color:#7C9CFF;text-decoration:underline;text-underline-offset:3px')}>
                {f.openReceipt} {d.receipts.length > 1 ? i + 1 : ''} {r.name && `(${r.name})`}
              </a>
            ))}
            <input ref={input} type="file" accept={ACCEPT} onChange={(e) => pick(e.target.files)} style={sx('display:none')} />
            <span style={sx('display:flex;gap:10px;align-items:center;flex-wrap:wrap')}>
              <button type="button" onClick={() => input.current?.click()} style={sx('height:36px;padding:0 14px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:13px;font-weight:600;cursor:pointer')}>
                {d.receipts.length ? f.form.receiptMore : f.form.receiptAdd}
              </button>
              {file && <span style={sx('font-size:13px;color:#ECEEF1')}>{file.name}</span>}
            </span>
          </div>
        </div>
        {err && (
          <div role="alert" style={sx('margin:8px 22px 0;padding:10px 14px;border-radius:12px;font-size:13px;background:rgba(255,107,94,.14);color:#FF6B5E')}>
            {err}
          </div>
        )}
        <div style={sx('padding:16px 22px 22px;display:flex;gap:10px;align-items:center;flex-wrap:wrap')}>
          <button onClick={() => void save()} disabled={busy} style={{ ...sx('height:42px;padding:0 20px;border:0;border-radius:10px;background:#7C9CFF;color:#0E1220;font-size:14px;font-weight:600;cursor:pointer'), opacity: busy ? 0.6 : 1 }}>
            {busy ? f.form.uploading : f.form.save}
          </button>
          <button onClick={onClose} style={sx('height:42px;padding:0 16px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:14px;cursor:pointer')}>
            {f.form.cancel}
          </button>
          {d.id && (
            <button onClick={() => (armed ? onVoid(d.id!) : setArmed(true))} style={sx('margin-left:auto;height:42px;padding:0 14px;border:0;border-radius:10px;background:transparent;color:#FF6B5E;font-size:13px;cursor:pointer')}>
              {armed ? f.form.voidSure : f.form.voidBtn}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
