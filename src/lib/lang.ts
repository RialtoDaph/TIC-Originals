import 'server-only';
import { cookies } from 'next/headers';
import type { Lang } from './types';

export async function getLang(cookie = 'tic-lang', fallback: Lang = 'de'): Promise<Lang> {
  const v = (await cookies()).get(cookie)?.value;
  return v === 'de' || v === 'en' ? v : fallback;
}
