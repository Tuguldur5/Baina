import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { sanitizeNext } from '@/lib/validators/auth';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.seo.register.title,
  description: mn.seo.register.description,
};

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return <RegisterForm next={sanitizeNext(searchParams.next)} />;
}
