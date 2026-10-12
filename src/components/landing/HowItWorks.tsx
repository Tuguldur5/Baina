'use client';

import { motion } from 'framer-motion';
import { Lock, LockOpen } from 'lucide-react';
import { staggerContainer, fadeInUp, scrollReveal } from '@/lib/animations';
import { mn } from '@/lib/i18n/mn';

/**
 * "Хэрхэн ажилладаг вэ" — 4 steps plus a small lock/unlock illustration of
 * the two-tier (staged) information model.
 */
export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
      <motion.div {...scrollReveal} className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
          {mn.landing.how.title}
        </h2>
        <p className="mt-3 text-muted">{mn.landing.how.subtitle}</p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {mn.landing.how.steps.map((step) => (
          <motion.div key={step.number} variants={fadeInUp}>
            <div className="card h-full p-6">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-base font-bold text-navy">
                {step.number}
              </span>
              <h3 className="mt-4 text-base font-semibold text-text">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Two-tier information illustration */}
      <motion.div
        {...scrollReveal}
        className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-text">
            <Lock className="h-4 w-4 text-warning-600" aria-hidden="true" />
            {mn.landing.how.twoTier.publicLabel}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {mn.landing.how.twoTier.publicText}
          </p>
          <div aria-hidden="true" className="mt-4 space-y-2">
            <div className="h-3 w-10/12 rounded-full bg-surface-2" />
            <div className="h-3 w-8/12 rounded-full bg-surface-2" />
            <div className="h-3 w-6/12 rounded-full bg-surface-2" />
          </div>
        </div>

        <div className="card border-info-200 p-6 dark:border-info-900">
          <h3 className="flex items-center gap-2 text-sm font-bold text-text">
            <LockOpen className="h-4 w-4 text-info-600" aria-hidden="true" />
            {mn.landing.how.twoTier.privateLabel}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {mn.landing.how.twoTier.privateText}
          </p>
          <div aria-hidden="true" className="mt-4 space-y-2">
            <div className="h-3 w-11/12 rounded-full bg-info-100" />
            <div className="h-3 w-9/12 rounded-full bg-info-100" />
            <div className="h-3 w-7/12 rounded-full bg-info-100" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
