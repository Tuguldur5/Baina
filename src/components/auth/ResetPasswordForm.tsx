'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import {
  updatePasswordSchema,
  type UpdatePasswordInput,
} from '@/lib/validators/auth';
import { createClient } from '@/lib/supabase/client';
import { mn } from '@/lib/i18n/mn';

type Status = 'checking' | 'ready' | 'invalid';

/**
 * Handles the password-recovery link:
 * `?code=` (PKCE) or `?token_hash=&type=` are exchanged for a session first,
 * then the user picks a new password.
 */
export function ResetPasswordForm({
  code,
  tokenHash,
  type,
}: {
  code?: string;
  tokenHash?: string;
  type?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<Status>('checking');
  const [mounted, setMounted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  useEffect(() => setMounted(true), []);

  // Exchange the recovery link for a session (client-side so cookies stick).
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const run = async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled) setStatus(error ? 'invalid' : 'ready');
        return;
      }
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: (type as 'recovery' | 'email_change') ?? 'recovery',
          token_hash: tokenHash,
        });
        if (!cancelled) setStatus(error ? 'invalid' : 'ready');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setStatus(data.session ? 'ready' : 'invalid');
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [code, tokenHash, type]);

  const onSubmit = async (values: UpdatePasswordInput) => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(mn.auth.reset.success);
    router.push('/dashboard');
    router.refresh();
  };

  if (status === 'checking') {
    return (
      <AuthShell title={mn.auth.reset.title} subtitle={mn.auth.reset.checking}>
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      </AuthShell>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthShell title={mn.auth.reset.invalidTitle}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 text-warning-700">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted">{mn.auth.reset.invalidText}</p>
          <Link href="/auth/forgot-password">
            <Button>{mn.auth.reset.invalidCta}</Button>
          </Link>
          <Link
            href="/"
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {mn.auth.shell.backHome}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={mn.auth.reset.title}
      subtitle={mn.auth.reset.subtitle}
      footer={
        <Link
          href="/auth/login"
          className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {mn.auth.forgot.backToLogin}
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label={mn.auth.reset.password}
          type="password"
          autoComplete="new-password"
          error={mounted ? errors.password?.message : undefined}
          disabled={isSubmitting}
          {...register('password')}
        />
        <Input
          label={mn.auth.reset.passwordConfirm}
          type="password"
          autoComplete="new-password"
          error={mounted ? errors.passwordConfirm?.message : undefined}
          disabled={isSubmitting}
          {...register('passwordConfirm')}
        />
        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          {mn.auth.reset.submit}
        </Button>
      </form>
    </AuthShell>
  );
}
