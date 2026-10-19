'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from '../StoreProvider';
import { StoreHeader } from '../Headers';
import { AccountFooter } from '../Footers';
import { createClient } from '@/lib/supabase/client';
import s from './Account.module.css';

/** Target of the password-reset email link (not in the designs; uses the Account form styles). */
export function ResetPassword() {
  const { t } = useStore();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  return (
    <div className={s.page}>
      <StoreHeader variant="account" />
      <main className={s.formCol} style={{ flex: 1 }}>
        <form
          className={s.formInner}
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.length < 8) return setErr(t.short);
            if (pw !== pw2) return setErr(t.mismatch);
            setErr('');
            setState('busy');
            const { error } = await createClient().auth.updateUser({ password: pw });
            if (error) {
              setErr(t.genericError);
              setState('idle');
            } else setState('done');
          }}
        >
          <h1 className={s.h1}>{t.newPwH}</h1>
          {state === 'done' ? (
            <>
              <span className={s.ok} role="status">
                {t.pwChanged}
              </span>
              <Link href="/account" className={s.submit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.myAcc}
              </Link>
            </>
          ) : (
            <>
              <div className={s.grid}>
                <label className={s.field} style={{ gridColumn: 'span 2' }}>
                  <span className={s.label}>{t.pwNew}</span>
                  <input type="password" autoComplete="new-password" className={s.input} value={pw} onChange={(e) => setPw(e.target.value)} />
                </label>
                <label className={s.field} style={{ gridColumn: 'span 2' }}>
                  <span className={s.label}>{t.pw2}</span>
                  <input type="password" autoComplete="new-password" className={s.input} value={pw2} onChange={(e) => setPw2(e.target.value)} />
                </label>
              </div>
              {err && (
                <span className={s.bad} role="alert">
                  {err}
                </span>
              )}
              <button className={s.submit} disabled={state === 'busy'}>
                {state === 'busy' ? t.loading : t.save}
              </button>
            </>
          )}
        </form>
      </main>
      <AccountFooter />
    </div>
  );
}
