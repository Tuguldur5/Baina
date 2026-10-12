'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { TenderCard } from '@/components/tenders/TenderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { staggerContainer, scrollReveal } from '@/lib/animations';
import { mn } from '@/lib/i18n/mn';
import type { TenderWithOwner } from '@/lib/types/index';

/** Featured open tenders (live data passed from the server page). */
export function FeaturedTenders({ tenders }: { tenders: TenderWithOwner[] }) {
  return (
    <section className="border-y border-border bg-surface-2/50 py-16">
      <motion.div {...scrollReveal} className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-text sm:text-3xl">
              {mn.landing.featured.title}
            </h2>
            <p className="mt-2 text-muted">{mn.landing.featured.subtitle}</p>
          </div>
          <Link
            href="/tenders"
            className="inline-flex min-h-tap items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-primary-400"
          >
            {mn.common.seeAll}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8">
          {tenders.length === 0 ? (
            <EmptyState title={mn.tenders.empty.title} text={mn.tenders.empty.text} />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {tenders.map((tender) => (
                <TenderCard key={tender.id} tender={tender} />
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
