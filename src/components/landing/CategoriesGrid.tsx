'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp, scrollReveal } from '@/lib/animations';
import { categoryGradient, categoryIcon } from '@/lib/categories';
import { Container } from '@/components/layout/Container';
import { cn } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';

/**
 * Categories grid — minimalist glass tiles: one gradient icon + the name, on a
 * frosted surface so the section mesh stays visible through the tile.
 */
export function CategoriesGrid() {
  return (
    <section className="relative overflow-hidden">
      {/* family mesh so the glass tiles actually have something to blur */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-mesh opacity-70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent"
      />

      <Container className="relative py-16">
        <motion.div {...scrollReveal} className="text-center">
          <h2 className="text-2xl font-bold text-text sm:text-3xl">
            {mn.landing.categories.title}
          </h2>
          <p className="mt-3 text-muted">{mn.landing.categories.subtitle}</p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {mn.categories.list.map((category) => {
            const Icon = categoryIcon(category);
            return (
              <motion.div key={category} variants={fadeInUp}>
                <Link
                  href={`/tenders?category=${encodeURIComponent(category)}`}
                  className="glass-panel group flex h-full flex-col items-center justify-center gap-3 p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:border-white/90 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:border-white/20"
                >
                  <span
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-card ring-1 ring-inset ring-white/25 transition-transform duration-200 group-hover:scale-105',
                      categoryGradient(category)
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-text">
                    {category}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </section>
  );
}
