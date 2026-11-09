import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NewsletterStatusPage } from '@/components/store/pages/NewsletterStatusPage';

const STATUSES = ['confirmed', 'unsubscribed', 'invalid'] as const;
export type NewsletterStatus = (typeof STATUSES)[number];

export const metadata: Metadata = { title: 'Newsletter', robots: { index: false } };

export default async function Page({ params }: PageProps<'/newsletter/[status]'>) {
  const { status } = await params;
  if (!(STATUSES as readonly string[]).includes(status)) notFound();
  return <NewsletterStatusPage status={status as NewsletterStatus} />;
}
