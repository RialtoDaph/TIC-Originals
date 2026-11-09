'use client';

import Link from 'next/link';
import { useStore } from '../StoreProvider';
import { StoreHeader } from '../Headers';
import { PoliciesFooter } from '../Footers';
import type { NewsletterStatus } from '@/app/(store)/newsletter/[status]/page';
import s from './Policies.module.css';

const COPY = {
  de: {
    confirmed: ['Newsletter', 'Du bist dabei', 'Danke, deine Anmeldung ist bestätigt. Du kannst dich jederzeit über den Link in jeder E-Mail abmelden.'],
    unsubscribed: ['Newsletter', 'Abgemeldet', 'Deine E-Mail-Adresse wurde aus dem Verteiler entfernt.'],
    invalid: ['Newsletter', 'Link ungültig', 'Dieser Link ist ungültig oder abgelaufen. Falls du Hilfe brauchst, schreib uns an company@ticoriginals.com.'],
    home: 'Zur Startseite',
  },
  en: {
    confirmed: ['Newsletter', "You're in", 'Thanks, your signup is confirmed. You can unsubscribe any time via the link in every email.'],
    unsubscribed: ['Newsletter', 'Unsubscribed', 'Your email address has been removed from the list.'],
    invalid: ['Newsletter', 'Link invalid', 'This link is invalid or has expired. If you need help, write to company@ticoriginals.com.'],
    home: 'Back to home',
  },
} as const;

export function NewsletterStatusPage({ status }: { status: NewsletterStatus }) {
  const { lang } = useStore();
  const [eyebrow, title, text] = COPY[lang][status];
  return (
    <div className={s.page}>
      <StoreHeader variant="policies" />
      <section className={s.hero}>
        <div className={s.noise} />
        <div className={s.heroInner}>
          <div className={s.eyebrowRow}>
            <span className={s.eyebrowLine} />
            <span className={s.eyebrow}>{eyebrow}</span>
          </div>
          <h1 className={s.h1}>{title}</h1>
        </div>
      </section>
      <div className={s.body}>
        <div className={s.main}>
          <p className={s.text}>{text}</p>
          <Link href="/" className={s.text}>
            {COPY[lang].home} →
          </Link>
        </div>
      </div>
      <PoliciesFooter />
    </div>
  );
}
