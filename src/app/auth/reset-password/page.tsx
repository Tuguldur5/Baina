import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.auth.reset.title,
  description: mn.auth.reset.subtitle,
};

/**
 * Password recovery landing page. Supabase sends the user here with either
 * `?code=` (PKCE) or `?token_hash=&type=` — both are handled client-side.
 */
export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { code?: string; token_hash?: string; type?: string };
}) {
  return (
    <ResetPasswordForm
      code={searchParams.code}
      tokenHash={searchParams.token_hash}
      type={searchParams.type}
    />
  );
}
