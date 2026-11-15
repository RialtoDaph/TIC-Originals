'use client';

import { useRef, useState } from 'react';
import { useStore } from './StoreProvider';
import { useDialog } from './dialog';
import type { SizeChart } from '@/config/size-charts';
import d from './CartDrawer.module.css';
import s from './SizeGuide.module.css';

/** Side panel with the garment measurements of one model; highlights the size picked on the page. */
export function SizeGuide({ chart, title, open, onClose, selected }: { chart: SizeChart; title: string; open: boolean; onClose: () => void; selected: string | null }) {
  const { t, lang } = useStore();
  const ref = useRef<HTMLElement>(null);
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useDialog(ref, open && mounted, onClose);
  if (!mounted) return null;
  const state = open ? 'open' : 'closed';
  const fmt = (cm: number) => (unit === 'cm' ? String(cm) : (cm / 2.54).toFixed(1).replace('.', lang === 'de' ? ',' : '.'));

  return (
    <>
      <div className={d.backdrop} data-state={state} onClick={onClose} />
      <aside
        ref={ref}
        className={d.aside}
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label={t.sizeGuide}
        tabIndex={-1}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && !open) setMounted(false);
        }}
      >
        <div className={d.head}>
          <span className={d.title}>{t.sizeGuide}</span>
          <button data-autofocus className={d.close} onClick={onClose} aria-label={t.close}>
            ×
          </button>
        </div>
        <div className={s.body} data-lenis-prevent>
          <div className={s.top}>
            <span className={s.model}>{title}</span>
            <div className={s.units} role="radiogroup" aria-label={t.sgUnit}>
              {(['cm', 'in'] as const).map((u) => (
                <button key={u} role="radio" aria-checked={unit === u} className={`${s.unit} ${unit === u ? s.unitOn : ''}`} onClick={() => setUnit(u)}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col" className={s.corner}>
                  {unit}
                </th>
                {chart.sizes.map((z) => (
                  <th key={z} scope="col" className={z === selected ? s.on : undefined}>
                    {z}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((r) => (
                <tr key={r.en}>
                  <th scope="row">{lang === 'de' ? r.de : r.en}</th>
                  {r.cm.map((v, i) => (
                    <td key={i} className={chart.sizes[i] === selected ? s.on : undefined}>
                      {fmt(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <dl className={s.how}>
            {chart.rows.map((r) => (
              <div key={r.en} className={s.howRow}>
                <dt>{lang === 'de' ? r.de : r.en}</dt>
                <dd>{lang === 'de' ? r.howDe : r.howEn}</dd>
              </div>
            ))}
          </dl>
          <p className={s.note}>{t.sgNote}</p>
        </div>
      </aside>
    </>
  );
}
