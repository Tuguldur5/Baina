'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Lock, Sparkles } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Container } from '@/components/layout/Container';
import { mn } from '@/lib/i18n/mn';

/**
 * Split-screen auth layout: form on the left, decorative gradient panel with
 * floating card art on the right (hidden below lg).
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Container className="grid items-center gap-12 py-10 lg:grid-cols-2 lg:gap-16 lg:py-16">
      {/* Form side */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="mx-auto w-full max-w-md"
      >
        <div className="card p-7 sm:p-8">
          <Link
            href="/"
            className="mx-auto mb-6 flex w-fit items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={mn.brand.name}
          >
            <Logo vertical="tender" variant="light" size={32} />
          </Link>
          <h1 className="text-center text-2xl font-bold tracking-tight text-text">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-center text-sm text-muted">{subtitle}</p>
          )}
          <div className="mt-7">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </motion.div>

      {/* Decorative side (desktop only) */}
      <motion.aside
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
        aria-hidden="true"
        className="relative hidden overflow-hidden rounded-3xl bg-navy p-10 ring-1 ring-white/10 lg:block"
        style={{ boxShadow: '0 30px 60px -30px rgb(15 23 42 / 0.6)' }}
      >
        {/* warm orange blobs */}
        <span className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-500/25 blur-3xl" />
        <span className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-primary-600/20 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-primary-500" />
            {mn.auth.shell.artBadge}
          </span>

          <h2 className="mt-5 max-w-sm text-3xl font-bold leading-tight tracking-tight text-white">
            {mn.auth.shell.artTitle}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
            {mn.auth.shell.artText}
          </p>

          <ul className="mt-8 space-y-3">
            {[
              { label: mn.auth.shell.artStep1, icon: 'pencil' },
              { label: mn.auth.shell.artStep2, icon: 'inbox' },
              { label: mn.auth.shell.artStep3, icon: 'lock' },
            ].map((step, index) => (
              <motion.li
                key={step.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + index * 0.12 }}
                className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10"
                style={{ transform: `translateX(${index * 10}px)` }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-navy">
                  {step.icon === 'lock' ? (
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="text-sm font-semibold text-white">{step.label}</span>
              </motion.li>
            ))}
          </ul>

          {/* floating accent card */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-8 w-fit rounded-2xl bg-white px-5 py-4 shadow-card"
          >
            <p className="text-xs font-semibold text-muted">{mn.roles.company}</p>
            <p className="mt-1 text-lg font-bold text-navy">
              ₮ 35,000,000
            </p>
            <p className="mt-0.5 text-xs text-muted">{mn.tenders.labels.budget}</p>
          </motion.div>
        </div>
      </motion.aside>
    </Container>
  );
}
