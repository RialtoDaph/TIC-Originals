'use client';

import { useEffect } from 'react';
import { StoreError } from '@/components/store/StoreError';

// Unexpected runtime errors in the storefront (not in the designs).
export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => console.error(error), [error]);
  const lang = typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'de';
  return <StoreError lang={lang} />;
}
