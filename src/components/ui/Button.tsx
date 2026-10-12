'use client';

import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Orange CTA with navy label — AA contrast on #F59E0B (see design override).
  primary:
    'bg-primary-500 text-navy shadow-card hover:bg-primary-600 active:bg-primary-700 dark:text-navy',
  secondary:
    'border border-border bg-surface text-text hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
};

const sizeClasses: Record<ButtonSize, string> = {
  // min touch target 44px on every size
  sm: 'min-h-tap h-11 px-4 text-sm',
  md: 'min-h-tap h-12 px-5 text-sm',
  lg: 'min-h-tap h-14 px-7 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled || loading ? undefined : { scale: 1.02 }}
        whileTap={disabled || loading ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          'disabled:pointer-events-none disabled:opacity-60',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </motion.button>
    );
  }
);
