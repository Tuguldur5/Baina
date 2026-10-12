'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import {
  registerSchema,
  getPasswordStrength,
  type RegisterInput,
} from '@/lib/validators/auth';
import { register as registerAction } from '@/lib/actions/auth';
import { mn } from '@/lib/i18n/mn';
import { cn } from '@/lib/utils';

const STRENGTH_COLORS = [
  'bg-danger-500',
  'bg-danger-500',
  'bg-warning-500',
  'bg-accent-500',
  'bg-accent-600',
];

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<'user' | 'company'>('user');
  const loginHref = `/auth/login${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      role: 'user',
      companyName: '',
      email: '',
      phone: '',
      password: '',
      passwordConfirm: '',
    },
  });

  const password = watch('password');
  const strength = getPasswordStrength(password ?? '');

  const selectRole = (next: 'user' | 'company') => {
    setRole(next);
    setValue('role', next, { shouldValidate: true });
  };

  const onSubmit = async (values: RegisterInput) => {
    const result = await registerAction(values);
    if (result.ok) {
      toast.success(mn.auth.register.success);
      router.push(loginHref);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <AuthShell
      title={mn.auth.register.title}
      subtitle={mn.auth.register.subtitle}
      footer={
        <p>
          {mn.auth.register.haveAccount}{' '}
          <Link
            href={loginHref}
            className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {mn.auth.register.loginLink}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Role picker */}
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-text">
            {mn.auth.register.role}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(['user', 'company'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => selectRole(option)}
                aria-pressed={role === option}
                className={cn(
                  'min-h-tap rounded-xl border px-4 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  role === option
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                    : 'border-border bg-surface text-muted hover:bg-surface-2'
                )}
              >
                {mn.roles[option]}
              </button>
            ))}
          </div>
          {mounted && errors.role && (
            <p className="mt-1 text-xs text-danger-600">{errors.role.message}</p>
          )}
        </fieldset>

        <Input
          label={mn.auth.register.name}
          placeholder={mn.auth.register.namePlaceholder}
          autoComplete="name"
          error={mounted ? errors.name?.message : undefined}
          disabled={isSubmitting}
          {...register('name')}
        />

        {role === 'company' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Input
              label={mn.auth.register.companyName}
              placeholder={mn.auth.register.companyNamePlaceholder}
              autoComplete="organization"
              error={mounted ? errors.companyName?.message : undefined}
              disabled={isSubmitting}
              {...register('companyName')}
            />
          </motion.div>
        )}

        <Input
          label={mn.auth.register.email}
          type="email"
          autoComplete="email"
          error={mounted ? errors.email?.message : undefined}
          disabled={isSubmitting}
          {...register('email')}
        />
        <Input
          label={`${mn.auth.register.phone} (${mn.common.optional})`}
          placeholder={mn.auth.register.phonePlaceholder}
          autoComplete="tel"
          inputMode="numeric"
          error={mounted ? errors.phone?.message : undefined}
          disabled={isSubmitting}
          {...register('phone')}
        />

        {/* Password + strength meter */}
        <div>
          <Input
            label={mn.auth.register.password}
            type="password"
            autoComplete="new-password"
            error={mounted ? errors.password?.message : undefined}
            disabled={isSubmitting}
            {...register('password')}
          />
          {(password ?? '').length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={cn(
                      'h-1.5 flex-1 rounded-full bg-surface-2 transition-colors',
                      index < strength && STRENGTH_COLORS[strength]
                    )}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">
                {mn.auth.register.passwordStrength}:{' '}
                {mn.auth.register.passwordLevels[strength]}
              </p>
            </div>
          )}
        </div>

        <Input
          label={mn.auth.register.passwordConfirm}
          type="password"
          autoComplete="new-password"
          error={mounted ? errors.passwordConfirm?.message : undefined}
          disabled={isSubmitting}
          {...register('passwordConfirm')}
        />

        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          {mn.auth.register.submit}
        </Button>
      </form>
    </AuthShell>
  );
}
