'use client';

import { useId } from 'react';
import { useStore } from './StoreProvider';
import s from './Header.module.css';

// Inline SVG flags: emoji flags don't render on Windows.
function FlagDE() {
  return (
    <svg viewBox="0 0 5 3" className={s.flag} aria-hidden="true">
      <rect width="5" height="1" y="0" fill="#000" />
      <rect width="5" height="1" y="1" fill="#DD0000" />
      <rect width="5" height="1" y="2" fill="#FFCE00" />
    </svg>
  );
}

function FlagGB() {
  const clip = 'gb' + useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 60 30" className={s.flag} aria-hidden="true">
      <clipPath id={clip}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${clip})`} stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

export function LangToggle() {
  const { lang, toggleLang } = useStore();
  return (
    <button type="button" className={s.lang} onClick={toggleLang} aria-label={lang === 'de' ? 'Switch to English' : 'Auf Deutsch umschalten'}>
      <span className={s.flagWrap} data-on={lang === 'de'} title="Deutsch">
        <FlagDE />
      </span>
      <span className={s.flagWrap} data-on={lang === 'en'} title="English">
        <FlagGB />
      </span>
    </button>
  );
}
