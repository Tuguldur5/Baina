import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MailCheck, TriangleAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { sanitizeNext } from '@/lib/validators/auth';
import { Button } from '@/components/ui/Button';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.auth.callback.confirmTitle,
  description: mn.auth.callback.confirmText,
};

/**
 * OAuth / email-confirmation code exchange.
 * Works whether or not Supabase email confirmation is enabled:
 * - with `?code=` we exchange it for a session and continue to `?next=`
 * - without a (valid) code we show a Mongolian "confirm your email" message
 */
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: { code?: string; next?: string; error_description?: string };
}) {
  const next = sanitizeNext(searchParams.next);
  const code = searchParams.code;

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
  }

  const failed = Boolean(code);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-92px)] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <span
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          failed ? 'bg-danger-50 text-danger-600' : 'bg-primary-50 text-primary-600'
        }`}
      >
        {failed ? (
          <TriangleAlert className="h-8 w-8" aria-hidden="true" />
        ) : (
          <MailCheck className="h-8 w-8" aria-hidden="true" />
        )}
      </span>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-text">
        {failed ? mn.auth.callback.errorText : mn.auth.callback.confirmTitle}
      </h1>
      {!failed && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {mn.auth.callback.confirmText}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/auth/login">
          <Button>{mn.auth.callback.cta}</Button>
        </Link>
        <Link href="/">
          <Button variant="secondary">{mn.auth.callback.home}</Button>
        </Link>
      </div>
    </div>
  );
}
