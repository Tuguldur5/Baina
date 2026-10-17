import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.seo.forgot.title,
  description: mn.seo.forgot.description,
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
