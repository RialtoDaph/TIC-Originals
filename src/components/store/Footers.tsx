'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from './StoreProvider';
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from './icons';
import { COMPANY_ADDRESS_LINE, LINKS, LINK_LABELS, PAYMENT_BADGES, SHORT_LINK_LABELS } from '@/i18n/storefront';
import { CATEGORIES } from '@/lib/categories';
import { SITE_IMAGES, img } from '@/lib/images';
import { SOCIAL } from '@/config/business';
import { subscribeNewsletter } from '@/app/(store)/actions';
import s from './Footer.module.css';

type LinkKey = keyof typeof LINKS;

function useGroups() {
  const { lang, t } = useStore();
  const L = LINK_LABELS[lang];
  const link = (k: LinkKey) => ({ label: L[k], href: LINKS[k] });
  const shop = [{ label: 'Shop All', href: '/shop' }, ...CATEGORIES.map((c) => ({ label: c.label, href: '/shop/' + c.slug }))];
  return {
    shop,
    support: (['contact', 'faq', 'track', 'shipping', 'returns'] as LinkKey[]).map(link),
    legal: (['impressum', 'datenschutz', 'agb', 'widerruf'] as LinkKey[]).map(link),
    t,
  };
}

function Badges() {
  return (
    <div className={s.badges}>
      {PAYMENT_BADGES.map((b) => (
        <span key={b} className={s.badge}>
          {b}
        </span>
      ))}
    </div>
  );
}

function NewsletterPill() {
  const { lang, t } = useStore();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  return (
    <>
      <form
        className={s.pill}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!email.trim()) return;
          setState('busy');
          const r = await subscribeNewsletter(email, 'footer', lang).catch(() => ({ ok: false }));
          setState(r.ok ? 'done' : 'error');
        }}
      >
        <input
          type="email"
          placeholder="E-MAIL"
          aria-label={t.email}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== 'busy') setState('idle');
          }}
          className={s.pillInput}
        />
        <button className={s.pillBtn} aria-label={t.send} disabled={state === 'busy'}>
          →
        </button>
      </form>
      {(state === 'done' || state === 'error') && (
        <span className={s.pillMsg} role="status">
          {state === 'done' ? t.subscribed : t.badEmail}
        </span>
      )}
    </>
  );
}

export function HomeFooter() {
  const { shop, support, legal, t } = useGroups();
  const [open, setOpen] = useState<number | null>(null);
  const acc: [string, { label: string; href: string }[]][] = [
    [t.accGroups.shop, shop],
    [t.accGroups.support, support],
    [t.accGroups.legal, legal],
  ];
  const gallery = [...SITE_IMAGES.gallery, ...SITE_IMAGES.gallery];
  return (
    <footer className={s.home}>
      <div className={s.commWrap}>
        <div className={s.comm}>
          <span className={s.commIcon}>
            <WhatsAppIcon />
          </span>
          <div className={s.commText}>
            <span className={s.commTitle}>{t.commTitle}</span>
            <span className={s.commSub}>{t.commSub}</span>
          </div>
          <a href={SOCIAL.community} className={s.join}>
            {t.join}
          </a>
        </div>
      </div>
      <div className={s.galleryWrap}>
        <div className={s.galleryClip}>
          <div className={s.galleryTrack}>
            {gallery.map((g, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={img(g)} alt="TIC community" className={s.galleryImg} loading="lazy" />
            ))}
          </div>
        </div>
        <span className={s.galleryLabel}>TIC Originals® | Official Site</span>
      </div>
      <div className={s.bottom}>
        <div className={s.brand}>
          <p className={s.brandLine}>{t.brandLine}</p>
          <div className={s.socials}>
            <a href={SOCIAL.instagram} className={s.social} aria-label="Instagram" target="_blank" rel="noreferrer">
              <InstagramIcon />
            </a>
            <a href={SOCIAL.tiktok} className={s.social} aria-label="TikTok">
              <TikTokIcon />
            </a>
          </div>
        </div>
        <div className={s.acc}>
          {acc.map(([h, links], i) => (
            <div key={h} className={s.accItem}>
              <button className={s.accBtn} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span>{h}</span>
                <span className={s.accCaret} style={{ transform: `rotate(${open === i ? '180deg' : '0deg'})` }}>
                  ▾
                </span>
              </button>
              {open === i && (
                <div className={s.accLinks}>
                  {links.map((l) => (
                    <Link key={l.href} href={l.href} className={s.accLink}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={s.move}>
          <span className={s.moveH}>{t.movement}</span>
          <span className={s.moveSub}>{t.movementSub}</span>
          <NewsletterPill />
        </div>
        <div className={s.legalRow}>
          <Badges />
          <span className={s.addr}>{COMPANY_ADDRESS_LINE}</span>
          <span className={s.copy}>{t.copyright}</span>
        </div>
      </div>
    </footer>
  );
}

export function ShopFooter() {
  const { shop, support, legal, t } = useGroups();
  const cols: [string, { label: string; href: string }[]][] = [
    ['Shop', shop],
    [t.service, support],
    [t.accGroups.legal, legal],
  ];
  return (
    <footer className={s.shop}>
      <div className={s.cols}>
        {cols.map(([h, links]) => (
          <div key={h} className={s.col}>
            <span className={s.colH}>{h}</span>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={s.colLink}>
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className={s.shopLegal}>
        <Badges />
        <span className={s.addr}>{COMPANY_ADDRESS_LINE}</span>
        <span className={s.copy}>{t.copyright}</span>
      </div>
    </footer>
  );
}

export function CheckoutFooter() {
  const { lang } = useStore();
  const L = SHORT_LINK_LABELS[lang];
  const keys: LinkKey[] = ['shipping', 'returns', 'agb', 'widerruf', 'datenschutz', 'impressum'];
  return (
    <footer className={s.checkout}>
      {keys.map((k) => (
        <Link key={k} href={LINKS[k]}>
          {L[k]}
        </Link>
      ))}
    </footer>
  );
}

export function AccountFooter() {
  const { lang, t } = useStore();
  const L = SHORT_LINK_LABELS[lang];
  const keys: LinkKey[] = ['contact', 'faq', 'agb', 'datenschutz', 'impressum'];
  return (
    <footer className={s.account}>
      <div className={s.accountLinks}>
        {keys.map((k) => (
          <Link key={k} href={LINKS[k]} className={s.accountLink}>
            {L[k]}
          </Link>
        ))}
      </div>
      <span className={s.accountCopy}>{t.copyrightShort}</span>
    </footer>
  );
}

export function PoliciesFooter() {
  const { t } = useStore();
  return (
    <footer className={s.policies}>
      <span>{COMPANY_ADDRESS_LINE}</span>
      <span className={s.policiesCopy}>{t.copyright}</span>
    </footer>
  );
}
