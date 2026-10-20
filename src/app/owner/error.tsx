'use client';

import { useEffect } from 'react';
import { OwnerLoadError } from '@/components/owner/OwnerLoadError';

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => console.error(error), [error]);
  return <OwnerLoadError lang={typeof document !== 'undefined' && document.cookie.includes('tic-owner-lang=de') ? 'de' : 'en'} />;
}
