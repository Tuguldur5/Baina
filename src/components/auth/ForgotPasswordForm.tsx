'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@/lib/validators/auth';
import { forgotPassword } from '@/lib/actions/auth';
import { mn } from '@/lib/i18n/mn';

export function ForgotPasswordForm() {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    const result = await forgotPassword(values);
    if (result.ok) {
      setSent(true);
      toast.success(mn.auth.forgot.sent);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <AuthShell
      title={mn.auth.forgot.title}
      subtitle={mn.auth.forgot.subtitle}
      footer={
        <Link
          href="/auth/login"
          className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {mn.auth.forgot.backToLogin}
        </Link>
      }
    >
      {sent ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 py-6 text-center"
        >
          <CheckCircle2
            className="h-12 w-12 text-accent-500"
            aria-hidden="true"
          />
          <p className="text-sm text-muted">{mn.auth.forgot.sent}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label={mn.auth.forgot.email}
            type="email"
            autoComplete="email"
            error={mounted ? errors.email?.message : undefined}
            disabled={isSubmitting}
            {...register('email')}
          />
          <Button type="submit" fullWidth loading={isSubmitting} size="lg">
            {mn.auth.forgot.submit}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
