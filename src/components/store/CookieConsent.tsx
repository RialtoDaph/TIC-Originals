'use client';

import Link from 'next/link';
import { useStore } from './StoreProvider';
import s from './CookieConsent.module.css';

export function CookieConsent() {
  const { t, consent, consentChecked, setConsent } = useStore();
  if (!consentChecked || consent) return null;
  return (
    <div role="dialog" aria-label="Cookies" className={s.box}>
      <span className={s.h}>{t.ckH}</span>
      <p className={s.p}>
        {t.ckP}{' '}
        <Link href="/policies/datenschutz" className={s.link}>
          {t.ckLink}
        </Link>
      </p>
      <div className={s.btns}>
        <button className={s.btn} onClick={() => setConsent('necessary')}>
          {t.ckNo}
        </button>
        <button className={s.btn} onClick={() => setConsent('all')}>
          {t.ckYes}
        </button>
      </div>
    </div>
  );
}
