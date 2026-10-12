import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import { sanitizeNext } from '@/lib/validators/auth';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.seo.login.title,
  description: mn.seo.login.description,
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return <LoginForm next={sanitizeNext(searchParams.next)} />;
}
