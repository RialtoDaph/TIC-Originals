import type { Metadata } from 'next';
import { ResetPassword } from '@/components/store/pages/ResetPassword';

export const metadata: Metadata = { title: 'Passwort', robots: { index: false } };

export default function Page() {
  return <ResetPassword />;
}
