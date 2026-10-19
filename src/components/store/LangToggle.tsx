'use client';

import { useStore } from './StoreProvider';
import s from './Header.module.css';

export function LangToggle() {
  const { lang, toggleLang } = useStore();
  return (
    <button type="button" className={s.lang} onClick={toggleLang} aria-label={lang === 'de' ? 'Switch to English' : 'Auf Deutsch umschalten'}>
      <span style={{ color: lang === 'de' ? '#fff' : '#777' }}>DE</span>
      <span className={s.langSep}>/</span>
      <span style={{ color: lang === 'en' ? '#fff' : '#777' }}>EN</span>
    </button>
  );
}
