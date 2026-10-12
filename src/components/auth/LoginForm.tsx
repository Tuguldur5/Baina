'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { loginSchema, type LoginInput, sanitizeNext } from '@/lib/validators/auth';
import { login } from '@/lib/actions/auth';
import { mn } from '@/lib/i18n/mn';

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const redirectTo = sanitizeNext(next);

  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    const result = await login(values);
    if (result.ok) {
      toast.success(mn.auth.login.success);
      router.push(redirectTo);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <AuthShell
      title={mn.auth.login.title}
      subtitle={mn.auth.login.subtitle}
      footer={
        <p>
          {mn.auth.login.noAccount}{' '}
          <Link
            href={`/auth/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {mn.auth.login.registerLink}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label={mn.auth.login.email}
          type="email"
          autoComplete="email"
          error={mounted ? errors.email?.message : undefined}
          disabled={isSubmitting}
          {...register('email')}
        />
        <Input
          label={mn.auth.login.password}
          type="password"
          autoComplete="current-password"
          error={mounted ? errors.password?.message : undefined}
          disabled={isSubmitting}
          {...register('password')}
        />
        <div className="text-right">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {mn.auth.login.forgot}
          </Link>
        </div>
        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          {mn.auth.login.submit}
        </Button>
      </form>
    </AuthShell>
  );
}
