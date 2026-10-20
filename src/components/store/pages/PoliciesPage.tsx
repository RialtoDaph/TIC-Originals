'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../StoreProvider';
import { StoreHeader } from '../Headers';
import { PoliciesFooter } from '../Footers';
import { createClient } from '@/lib/supabase/client';
import { fmtDateTime } from '@/lib/format';
import { sendContactMessage } from '@/app/(store)/actions';
import { faq, GROUPS, LEGAL_UPDATED, POLICY_T, policyPage, type Block, type PolicyKey } from '@/i18n/policies';
import s from './Policies.module.css';

interface Tracked {
  order_no: string;
  status: string;
  carrier: string;
  tracking: string;
  placed_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  total_cents: number;
  items: { name: string; size: string; qty: number; unit_cents: number }[];
}

const FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const;
const FLOW_INDEX: Record<string, number> = { pending: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4, returned: 4, cancelled: 0 };

function TrackBlock({ initialNo }: { initialNo: string }) {
  const { t: st, lang, money } = useStore();
  const t = POLICY_T[lang];
  const [val, setVal] = useState(initialNo);
  const [state, setState] = useState<'idle' | 'busy' | 'none' | 'error'>('idle');
  const [order, setOrder] = useState<Tracked | null>(null);

  async function run(no = val) {
    if (!no.trim()) return;
    setState('busy');
    const { data, error } = await createClient().rpc('track_order', { p_order_no: no.trim() });
    if (error) {
      setOrder(null);
      setState('error');
    } else if (!data) {
      setOrder(null);
      setState('none');
    } else {
      setOrder(data as Tracked);
      setState('idle');
    }
  }

  const ran = useRef(false);
  useEffect(() => {
    if (initialNo && !ran.current) {
      ran.current = true;
      void run(initialNo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNo]);

  const cur = order ? FLOW_INDEX[order.status] ?? 0 : 0;
  const dates: (string | null)[] = order ? [order.placed_at, order.paid_at, order.paid_at, order.shipped_at, order.delivered_at] : [];

  return (
    <div className={s.track}>
      <form
        className={s.trackRow}
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="TIC-2026-XXXXXX" aria-label={t.orderNo} className={s.trackInput} />
        <button className={s.trackBtn} disabled={state === 'busy'}>
          {state === 'busy' ? st.loading : t.track}
        </button>
      </form>
      {state === 'none' && (
        <span className={s.notFound} role="alert">
          {t.notFound}
        </span>
      )}
      {state === 'error' && (
        <span className={s.notFound} role="alert">
          {st.genericError}
        </span>
      )}
      {order && (
        <div className={s.result}>
          <div className={s.resultHead}>
            <div className={s.resultHeadL}>
              <span className={s.resultLabel}>{t.orderNo}</span>
              <span className={s.resultNo}>{order.order_no}</span>
              {order.tracking && (
                <span className={s.resultTrack}>
                  {order.carrier}: {order.tracking}
                </span>
              )}
            </div>
            <span className={s.resultStatus}>{st.st[order.status] ?? order.status}</span>
          </div>
          <div className={s.timeline}>
            {FLOW.map((k, i) => {
              const done = i < cur;
              const now = i === cur;
              return (
                <div key={k} className={s.tl}>
                  <div className={s.tlCol}>
                    <span
                      className={s.tlN}
                      style={{
                        background: now ? '#9EF2FF' : done ? '#111' : '#fff',
                        color: done ? '#fff' : now ? '#111' : '#8A8A8A',
                        borderColor: i <= cur ? '#111' : '#DADADA',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className={s.tlLine} style={{ background: i < FLOW.length - 1 ? (done ? '#111' : '#DADADA') : 'transparent' }} />
                  </div>
                  <div className={s.tlText}>
                    <span className={s.tlLabel} style={{ color: i <= cur ? '#111' : '#8A8A8A' }}>
                      {st.st[k]}
                    </span>
                    <span className={s.tlDate}>{i <= cur && dates[i] ? fmtDateTime(dates[i]!, lang) : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={s.lines}>
            {order.items.map((it, i) => (
              <div key={i} className={s.line}>
                <span>
                  {it.name} · {it.size} · ×{it.qty}
                </span>
                <span>{money((it.unit_cents * it.qty) / 100)}</span>
              </div>
            ))}
            <div className={s.lineTotal}>
              <span className={s.lineTotalK}>{t.total}</span>
              <span className={s.lineTotalV}>{money(order.total_cents / 100)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactBlock() {
  const { lang } = useStore();
  const t = POLICY_T[lang];
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const input = (k: 'name' | 'email' | 'subject', label: string, type = 'text') => (
    <label className={s.cLabel}>
      <span className={s.cLabelT}>{label}</span>
      <input type={type} className={s.cInput} value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} required={k !== 'subject'} />
    </label>
  );
  return (
    <div className={s.contact}>
      <form
        className={s.contactForm}
        onSubmit={async (e) => {
          e.preventDefault();
          setState('busy');
          const r = await sendContactMessage(f).catch(() => ({ ok: false }));
          setState(r.ok ? 'sent' : 'error');
        }}
      >
        <div className={s.contactGrid}>
          {input('name', 'Name')}
          {input('email', 'E-Mail', 'email')}
        </div>
        {input('subject', t.subject)}
        <label className={s.cLabel}>
          <span className={s.cLabelT}>{t.message}</span>
          <textarea rows={5} className={s.cTextarea} value={f.message} onChange={(e) => setF((p) => ({ ...p, message: e.target.value }))} required />
        </label>
        {state === 'error' && (
          <span className={s.err} role="alert">
            {t.sendFailed}
          </span>
        )}
        <button className={s.sendBtn} disabled={state === 'busy' || state === 'sent'}>
          {state === 'sent' ? t.sent : state === 'busy' ? t.sending : t.send}
        </button>
      </form>
      <div className={s.contactAside}>
        <span className={s.contactBrand}>TIC Originals</span>
        <div className={s.contactRow}>
          <span className={s.contactK}>E-Mail</span>
          <a href="mailto:company@ticoriginals.com" className={s.contactV}>
            company@ticoriginals.com
          </a>
        </div>
        <div className={s.contactRow}>
          <span className={s.contactK}>{t.phone}</span>
          <a href="tel:+4915207889847" className={s.contactV}>
            +49 152 07889847
          </a>
        </div>
        <div className={s.contactRow}>
          <span className={s.contactK}>{t.address}</span>
          <span className={s.contactV}>
            An der Oberen Au 4<br />
            85072 Eichstätt, Germany
          </span>
        </div>
        <span className={s.reply}>{t.replyTime}</span>
      </div>
    </div>
  );
}

function BlockView({ b, faqItems }: { b: Block; faqItems: [string, string][] }) {
  const { lang } = useStore();
  const t = POLICY_T[lang];
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [formOpen, setFormOpen] = useState(false);
  const h = 'h' in b && b.h ? <span className={s.blockH}>{b.h}</span> : null;
  switch (b.type) {
    case 'text':
      return (
        <div className={s.block}>
          {h}
          <p className={s.text}>{b.p}</p>
        </div>
      );
    case 'note':
      return (
        <div className={s.block}>
          <p className={s.note}>{b.p}</p>
        </div>
      );
    case 'table':
      return (
        <div className={s.block}>
          {h}
          <div className={s.table}>
            {b.rows.map(([k, v]) => (
              <div key={k} className={s.tableRow}>
                <span className={s.tableK}>{k}</span>
                <span className={s.tableV}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'list':
      return (
        <div className={s.block}>
          {h}
          <div className={s.list}>
            {b.items.map((x) => (
              <div key={x} className={s.li} style={{ color: b.bad ? '#6E6E6E' : '#111' }}>
                <span className={s.mark} style={{ background: b.bad ? '#EDEDED' : '#9EF2FF' }}>
                  {b.bad ? '×' : '✓'}
                </span>
                <span>{x}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'steps':
      return (
        <div className={s.block}>
          {h}
          <div className={s.steps}>
            {b.steps.map(([title, desc], i) => (
              <div key={title} className={s.step}>
                <span className={s.stepN}>{'0' + (i + 1)}</span>
                <span className={s.stepT}>{title}</span>
                <span className={s.stepD}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'faq':
      return (
        <div className={s.block}>
          <div className={s.faq}>
            {faqItems.map(([q, a], i) => (
              <div key={q} className={s.faqItem}>
                <button className={s.faqBtn} onClick={() => setFaqOpen(faqOpen === i ? null : i)} aria-expanded={faqOpen === i}>
                  <span className={s.faqN}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={s.faqQ}>{q}</span>
                  <span className={`${s.faqSign} ${faqOpen === i ? s.faqSignOpen : ''}`}>{faqOpen === i ? '−' : '+'}</span>
                </button>
                {faqOpen === i && <p className={s.faqA}>{a}</p>}
              </div>
            ))}
          </div>
        </div>
      );
    case 'form':
      return (
        <div className={s.block}>
          {h}
          <div className={s.formWrap}>
            <button className={s.outlineBtn} onClick={() => setFormOpen((o) => !o)} aria-expanded={formOpen}>
              {formOpen ? t.hideForm : t.showForm}
            </button>
            {formOpen && <div className={s.formText}>{t.formText}</div>}
          </div>
        </div>
      );
    default:
      return null;
  }
}

export function PoliciesPage({ page, trackNo }: { page: PolicyKey; trackNo: string }) {
  const { lang, amount, settings } = useStore();
  const t = POLICY_T[lang];
  const ship = { de: amount(settings.shipDeCents), intl: amount(settings.shipIntlCents), free: amount(settings.freeShipCents) };
  const p = policyPage(page, lang, ship);
  const faqItems = faq(lang, ship);
  return (
    <div className={s.page}>
      <StoreHeader variant="policies" />
      <section className={s.hero}>
        <div className={s.noise} />
        <div className={s.heroInner}>
          <div className={s.eyebrowRow}>
            <span className={s.eyebrowLine} />
            <span className={s.eyebrow}>{p.eyebrow}</span>
          </div>
          <h1 className={s.h1}>{p.title}</h1>
          {p.intro && <p className={s.intro}>{p.intro}</p>}
        </div>
      </section>
      <div className={s.body}>
        <aside className={s.aside}>
          {GROUPS.map(([g, keys]) => (
            <nav key={g} className={s.group} aria-label={t[g]}>
              <span className={s.groupH}>{t[g]}</span>
              {keys.map((k) => (
                <Link key={k} href={'/policies/' + k} className={`${s.navItem} ${k === page ? s.navItemActive : ''}`} aria-current={k === page ? 'page' : undefined}>
                  {t.labels[k]}
                </Link>
              ))}
            </nav>
          ))}
        </aside>
        <main className={s.main}>
          {p.blocks.map((b, i) =>
            b.type === 'track' ? (
              <div key={i} className={s.block}>
                <span className={s.blockH}>{b.h}</span>
                <TrackBlock initialNo={trackNo} />
              </div>
            ) : b.type === 'contact' ? (
              <div key={i} className={s.block}>
                <ContactBlock />
              </div>
            ) : (
              <BlockView key={page + i} b={b} faqItems={faqItems} />
            ),
          )}
          {p.legal && (
            <span className={s.updated}>
              {t.updated} {LEGAL_UPDATED}
            </span>
          )}
        </main>
      </div>
      <PoliciesFooter />
    </div>
  );
}
