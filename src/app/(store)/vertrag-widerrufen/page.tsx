import type { Metadata } from 'next';
import { WithdrawalPage } from '@/components/store/pages/WithdrawalPage';

export const metadata: Metadata = { title: 'Vertrag widerrufen', alternates: { canonical: '/vertrag-widerrufen' } };

/** Widerrufsfunktion (§ 356a BGB): reachable from every footer and from each order in the account. */
export default async function Page({ searchParams }: PageProps<'/vertrag-widerrufen'>) {
  const { order } = await searchParams;
  return <WithdrawalPage initialOrder={typeof order === 'string' ? order.slice(0, 60) : ''} />;
}
