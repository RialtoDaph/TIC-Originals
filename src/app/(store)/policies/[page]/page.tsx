import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PoliciesPage } from '@/components/store/pages/PoliciesPage';
import { POLICY_KEYS, POLICY_T, type PolicyKey } from '@/i18n/policies';
import { getLang } from '@/lib/lang';

const isKey = (k: string): k is PolicyKey => (POLICY_KEYS as readonly string[]).includes(k);

export async function generateMetadata({ params }: PageProps<'/policies/[page]'>): Promise<Metadata> {
  const { page } = await params;
  if (!isKey(page)) return {};
  return { title: POLICY_T[await getLang()].labels[page] };
}

export default async function Page({ params, searchParams }: PageProps<'/policies/[page]'>) {
  const { page } = await params;
  if (!isKey(page)) notFound();
  const sp = await searchParams;
  return <PoliciesPage page={page} trackNo={typeof sp.no === 'string' ? sp.no : ''} />;
}
