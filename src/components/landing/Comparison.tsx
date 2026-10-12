'use client';

import { motion } from 'framer-motion';
import { Check, User, Building2 } from 'lucide-react';
import { staggerContainer, fadeInUp, scrollReveal } from '@/lib/animations';
import { mn } from '@/lib/i18n/mn';

/** "Хувь хүн / Компани" benefit comparison. */
export function Comparison() {
  const columns = [
    {
      icon: User,
      title: mn.landing.compare.individual.title,
      benefits: mn.landing.compare.individual.benefits,
      accent: 'bg-accent-600', // individual = green
    },
    {
      icon: Building2,
      title: mn.landing.compare.company.title,
      benefits: mn.landing.compare.company.benefits,
      accent: 'bg-info-600', // company = blue
    },
  ] as const;

  return (
    <section className="border-y border-border bg-surface-2/50 py-16">
      <motion.div {...scrollReveal} className="mx-auto max-w-6xl px-4 text-center">
        <h2 className="text-2xl font-bold text-text sm:text-3xl">
          {mn.landing.compare.title}
        </h2>
        <p className="mt-3 text-muted">{mn.landing.compare.subtitle}</p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 px-4 md:grid-cols-2"
      >
        {columns.map((column) => (
          <motion.div key={column.title} variants={fadeInUp}>
            <div className="card h-full p-8">
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white ${column.accent}`}
              >
                <column.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-xl font-bold text-text">
                {column.title}
              </h3>
              <ul className="mt-6 space-y-3">
                {column.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600 dark:bg-accent-950 dark:text-accent-400">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-muted">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
