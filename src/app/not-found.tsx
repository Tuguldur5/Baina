'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { mn } from '@/lib/i18n/mn';

const SHAPES = [
  { className: 'left-[10%] top-[20%] h-16 w-16 bg-primary-300/30', duration: 7 },
  { className: 'right-[15%] top-[15%] h-10 w-10 bg-accent-300/30', duration: 9 },
  { className: 'left-[20%] bottom-[15%] h-12 w-12 bg-warning-300/30', duration: 8 },
  { className: 'right-[10%] bottom-[25%] h-14 w-14 bg-primary-400/20', duration: 10 },
] as const;

/** 404 page with animated code and floating shapes. */
export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* subtle floating shapes */}
      {SHAPES.map((shape, index) => (
        <motion.span
          key={index}
          aria-hidden="true"
          className={`pointer-events-none absolute rounded-3xl blur-sm ${shape.className}`}
          animate={{ y: [-16, 16, -16], rotate: [-8, 8, -8] }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mb-8"
      >
        <Logo vertical="tender" variant="light" size={32} />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="text-gradient-primary text-8xl font-extrabold tracking-tight sm:text-9xl"
      >
        {mn.errors.notFoundCode}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }}
      >
        <h1 className="mt-4 text-2xl font-bold text-text sm:text-3xl">
          {mn.errors.notFoundTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          {mn.errors.notFoundText}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-tap items-center gap-2 rounded-full bg-primary-500 px-6 text-base font-semibold text-navy shadow-card transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          {mn.errors.notFoundCta}
        </Link>
      </motion.div>
    </div>
  );
}
