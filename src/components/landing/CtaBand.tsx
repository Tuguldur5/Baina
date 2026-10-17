'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlusCircle, UserPlus } from 'lucide-react';
import { scrollReveal } from '@/lib/animations';
import { Container } from '@/components/layout/Container';
import { mn } from '@/lib/i18n/mn';

/** Final CTA band with gradient background. */
export function CtaBand() {
  return (
    <section>
      <Container className="py-16">
      <motion.div
        {...scrollReveal}
        className="relative overflow-hidden rounded-3xl bg-navy px-6 py-14 text-center ring-1 ring-white/10 shadow-card-hover"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -bottom-20 h-64 w-64 rounded-full bg-primary-500/25 blur-3xl"
        />
        <h2 className="relative text-2xl font-bold text-white sm:text-3xl">
          {mn.landing.cta.title}
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-white/70">
          {mn.landing.cta.text}
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/auth/register"
            className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-full bg-primary-500 px-6 text-base font-semibold text-navy shadow-card transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy sm:w-auto"
          >
            <PlusCircle className="h-5 w-5" aria-hidden="true" />
            {mn.landing.cta.primary}
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-full border border-white/30 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy sm:w-auto"
          >
            <UserPlus className="h-5 w-5" aria-hidden="true" />
            {mn.landing.cta.secondary}
          </Link>
        </div>
      </motion.div>
      </Container>
    </section>
  );
}
