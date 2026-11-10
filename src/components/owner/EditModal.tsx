'use client';

import { useEffect, useRef, useState } from 'react';
import { SIZES } from '@/lib/owner/derive';
import { img } from '@/lib/images';
import { uploadProductImage } from '@/lib/owner/upload';
import { createBundle, createCode, saveProduct } from '@/app/owner/actions';
import { useOwner, type ModalState } from './OwnerContext';
import { sx } from './sx';

const textareaStyle = sx('min-height:84px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#14161A;color:#ECEEF1;font-size:14px;line-height:1.45;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit');
const smallBtn = sx('width:26px;height:26px;border:0;border-radius:7px;background:rgba(0,0,0,.65);color:#fff;font-size:13px;line-height:1;cursor:pointer;padding:0');

/** Product photos: upload (resized in the browser), reorder (first = main photo), remove. */
function ProductImages({ images, onChange, uploading, setUploading }: { images: string[]; onChange: (next: string[]) => void; uploading: number; setUploading: (fn: (n: number) => number) => void }) {
  const { t } = useOwner();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  // Uploads finish one by one; append each photo to the newest list, not the one from when the upload started.
  const latest = useRef(images);
  useEffect(() => {
    latest.current = images;
  }, [images]);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    const list = [...files].slice(0, Math.max(0, 10 - latest.current.length));
    if (list.length < files.length) setError(t.img.max);
    setUploading((n) => n + list.length);
    for (const file of list) {
      const r = await uploadProductImage(file);
      setUploading((n) => n - 1);
      if ('url' in r) {
        latest.current = [...latest.current, r.url];
        onChange(latest.current);
      } else setError(t.img.err[r.error]);
    }
    if (input.current) input.current.value = '';
  }

  const move = (i: number, to: number) => {
    const next = [...images];
    const [x] = next.splice(i, 1);
    next.splice(to, 0, x);
    onChange(next);
  };

  return (
    <div style={sx('display:flex;flex-direction:column;gap:8px')}>
      <span style={sx('font-size:12px;color:#9AA1AC')}>{t.img.label}</span>
      <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px')}>
        {images.map((src, i) => (
          <div key={src} style={sx('position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:#fff')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(src)} alt="" style={sx('width:100%;height:100%;object-fit:cover;display:block')} />
            {i === 0 && <span style={sx('position:absolute;left:6px;bottom:6px;padding:2px 7px;border-radius:6px;background:#7C9CFF;color:#0E1220;font-size:11px;font-weight:600')}>{t.img.main}</span>}
            <div style={sx('position:absolute;top:6px;right:6px;display:flex;gap:4px')}>
              {i > 0 && (
                <button type="button" onClick={() => move(i, 0)} title={t.img.makeMain} aria-label={t.img.makeMain} style={smallBtn}>
                  ★
                </button>
              )}
              {i > 0 && (
                <button type="button" onClick={() => move(i, i - 1)} title={t.img.left} aria-label={t.img.left} style={smallBtn}>
                  ←
                </button>
              )}
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} title={t.img.remove} aria-label={t.img.remove} style={smallBtn}>
                ×
              </button>
            </div>
          </div>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={'u' + i} style={sx('aspect-ratio:1;border-radius:10px;background:#14161A;display:flex;align-items:center;justify-content:center;font-size:12px;color:#9AA1AC')}>
            {t.img.uploading}
          </div>
        ))}
        {images.length + uploading < 10 && (
          <button type="button" onClick={() => input.current?.click()} style={sx('aspect-ratio:1;border-radius:10px;border:1px dashed rgba(255,255,255,.2);background:transparent;color:#ECEEF1;font-size:13px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px')}>
            <span style={sx('font-size:22px;line-height:1')}>+</span>
            {t.img.add}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void add(e.target.files)} />
      <span style={sx('font-size:12px;color:#6B727D')}>{t.img.hint}</span>
      {error && (
        <span role="alert" style={sx('font-size:13px;color:#FF6B5E')}>
          {error}
        </span>
      )}
    </div>
  );
}

const inputStyle = sx('height:42px;padding:0 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#14161A;color:#ECEEF1;font-size:14px;outline:none;box-sizing:border-box;min-width:0');

/** New discount code / add or edit product / new bundle. */
export function EditModal() {
  const { t, ui, setUi, run, busy } = useOwner();
  const m = ui.modal!;
  const first = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  useEffect(() => first.current?.focus(), []);
  const close = () => setUi({ modal: null, modalErr: '' });
  const setDraft = (patch: Record<string, unknown>) => setUi((s) => (s.modal ? { modal: { ...s.modal, draft: { ...s.modal.draft, ...patch } } as ModalState } : {}));
  const d = m.draft as Record<string, unknown>;

  const fields: [string, string, string][] =
    m.kind === 'code'
      ? [
          ['code', t.f.code, 'SUMMER20'],
          ['value', m.draft.pct ? t.f.pctValue : t.f.eurValue, m.draft.pct ? '20' : '5'],
          ['min', t.f.min, '0'],
          ['until', t.f.until, t.f.optional],
          ['limit', t.f.limit, t.f.unlimited],
        ]
      : m.kind === 'product'
        ? [
            ['name', t.f.name, ''],
            ['category', t.f.category, 'Tops'],
            ['price', t.f.price, '69.89'],
            ['model', t.f.model, 'Choppa Tee'],
            ['setName', t.f.setName, 'Camo Set Grau'],
            ['color', t.f.color, 'Schwarz'],
            ['weight', t.f.weight, '220'],
            ['materialDe', t.f.materialDe, '100% Baumwolle'],
            ['materialEn', t.f.materialEn, '100% cotton'],
            ['low', t.f.low, '3'],
          ]
        : [
            ['name', t.f.name, 'Starter Pack'],
            ['summary', t.f.summary, '2 tees, any combination'],
            ['normal', t.f.normal, ''],
            ['price', t.f.bundlePrice, ''],
          ];
  const title = m.kind === 'code' ? t.modal.code : m.kind === 'bundle' ? t.modal.bundle : m.draft.id ? t.modal.editProduct : t.modal.addProduct;

  async function save() {
    const err = (k: keyof typeof t.err) => setUi({ modalErr: t.err[k] });
    if (m.kind === 'code') {
      const c = m.draft;
      if (!/^[A-Z0-9]+$/.test(c.code)) return err('code');
      const v = Number(c.value.replace(',', '.'));
      if (!v || v <= 0 || (c.pct && v > 100)) return err(c.pct ? 'pct' : 'value');
      if (c.until && !/^\d{4}-\d{2}-\d{2}$/.test(c.until)) return err('until');
      let failure = '';
      const ok = await run(async () => {
        const r = await createCode(c);
        if (!r.ok) failure = r.error;
        return r;
      }, t.toast.codeCreated(c.code));
      if (ok) close();
      else if (failure in t.err) err(failure as keyof typeof t.err);
    } else if (m.kind === 'product') {
      if (!m.draft.name.trim()) return err('name');
      if (uploading) return;
      let failure = '';
      const ok = await run(async () => {
        const r = await saveProduct(m.draft);
        if (!r.ok) failure = r.error;
        return r;
      }, m.draft.id ? t.toast.productUpdated : t.toast.productAdded);
      if (ok) close();
      else if (failure in t.err) err(failure as keyof typeof t.err);
    } else {
      const b = m.draft;
      if (!b.name.trim() || !b.normal || !b.price) return err('bundle');
      if (await run(() => createBundle(b), t.toast.bundleCreated)) close();
    }
  }

  return (
    <>
      <div onClick={close} style={sx('position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.5)')} />
      <div role="dialog" aria-modal="true" aria-label={title} style={sx('position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:41;width:600px;max-width:calc(100% - 32px);max-height:calc(100vh - 48px);overflow-y:auto;background:#1C1F25;border-radius:18px;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.5)')}>
        <div style={sx('padding:20px 22px;display:flex;justify-content:space-between;align-items:center')}>
          <span style={sx('font-size:20px;font-weight:600')}>{title}</span>
          <button onClick={close} aria-label={t.close} style={sx('width:36px;height:36px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:18px;cursor:pointer')}>
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div style={sx('padding:0 22px 18px;display:flex;flex-direction:column;gap:14px')}>
            {m.kind === 'product' && <ProductImages images={m.draft.images} onChange={(images) => setDraft({ images })} uploading={uploading} setUploading={setUploading} />}
            {fields.map(([key, label, ph], i) => (
              <label key={key} style={sx('display:flex;flex-direction:column;gap:6px')}>
                <span style={sx('font-size:12px;color:#9AA1AC')}>{label}</span>
                <input
                  ref={i === 0 ? first : undefined}
                  value={String(d[key] ?? '')}
                  placeholder={ph}
                  onChange={(e) => setDraft({ [key]: key === 'code' ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : e.target.value })}
                  style={inputStyle}
                />
              </label>
            ))}
            {m.kind === 'code' && (
              <div style={sx('display:flex;gap:20px;flex-wrap:wrap;font-size:14px')}>
                <label style={sx('display:flex;gap:8px;align-items:center;cursor:pointer')}>
                  <input type="checkbox" checked={m.draft.pct} onChange={() => setDraft({ pct: !m.draft.pct })} style={sx('accent-color:#7C9CFF')} />
                  {t.f.percentage}
                </label>
                <label style={sx('display:flex;gap:8px;align-items:center;cursor:pointer')}>
                  <input type="checkbox" checked={m.draft.first} onChange={() => setDraft({ first: !m.draft.first })} style={sx('accent-color:#7C9CFF')} />
                  {t.f.firstOnly}
                </label>
              </div>
            )}
            {m.kind === 'product' && (
              <div style={sx('display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap')}>
                <label style={sx('display:flex;gap:8px;align-items:center;cursor:pointer;font-size:14px;height:42px')}>
                  <input type="checkbox" checked={m.draft.preorder} onChange={() => setDraft({ preorder: !m.draft.preorder })} style={sx('accent-color:#7C9CFF')} />
                  {t.f.preorder}
                </label>
                {m.draft.preorder && (
                  <label style={sx('display:flex;flex-direction:column;gap:6px;flex:1;min-width:180px')}>
                    <span style={sx('font-size:12px;color:#9AA1AC')}>{t.f.shipsFrom}</span>
                    <input type="date" value={m.draft.shipsFrom} onChange={(e) => setDraft({ shipsFrom: e.target.value })} style={{ ...inputStyle, colorScheme: 'dark' }} />
                  </label>
                )}
              </div>
            )}
            {m.kind === 'product' && m.draft.preorder && <span style={sx('font-size:12px;color:#6B727D;margin-top:-6px')}>{t.f.preorderHint}</span>}
            {m.kind === 'product' && (
              <div style={sx('display:flex;flex-direction:column;gap:6px')}>
                <span style={sx('font-size:12px;color:#9AA1AC')}>{t.f.stockPerSize}</span>
                <div style={{ ...sx('display:grid;gap:8px'), gridTemplateColumns: `repeat(${SIZES.length},minmax(0,1fr))` }}>
                  {SIZES.map((z) => (
                    <label key={z} style={sx('display:flex;flex-direction:column;gap:6px;align-items:center')}>
                      <span style={sx('font-size:13px;font-weight:600')}>{z}</span>
                      <input
                        inputMode="numeric"
                        value={m.draft.stock[z] ?? '0'}
                        onChange={(e) => setDraft({ stock: { ...m.draft.stock, [z]: e.target.value.replace(/[^0-9]/g, '') } })}
                        style={sx("width:100%;box-sizing:border-box;height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#14161A;color:#ECEEF1;text-align:center;font-family:'DM Mono',monospace;font-size:14px;outline:none")}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
            {m.kind === 'product' &&
              (
                [
                  ['descriptionDe', t.f.descriptionDe],
                  ['descriptionEn', t.f.descriptionEn],
                  ['careDe', t.f.careDe],
                  ['careEn', t.f.careEn],
                ] as const
              ).map(([key, label]) => (
                <label key={key} style={sx('display:flex;flex-direction:column;gap:6px')}>
                  <span style={sx('font-size:12px;color:#9AA1AC')}>{label}</span>
                  <textarea value={m.draft[key]} onChange={(e) => setDraft({ [key]: e.target.value })} style={textareaStyle} />
                </label>
              ))}
            {ui.modalErr && (
              <span role="alert" style={sx('font-size:13px;color:#FF6B5E')}>
                {ui.modalErr}
              </span>
            )}
          </div>
          <div style={sx('padding:12px 22px 20px;display:flex;justify-content:flex-end;gap:8px')}>
            <button type="button" onClick={close} style={sx('height:38px;padding:0 16px;border:0;border-radius:10px;background:#2A2E36;color:#ECEEF1;font-size:13px;font-weight:500;cursor:pointer')}>
              {t.cancel}
            </button>
            <button disabled={busy || uploading > 0} style={sx('height:38px;padding:0 18px;border:0;border-radius:10px;background:#7C9CFF;color:#0E1220;font-size:13px;font-weight:600;cursor:pointer')}>
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
