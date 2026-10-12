'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { scrollReveal } from '@/lib/animations';
import { mn } from '@/lib/i18n/mn';

type StatKey = 'openBudget' | 'openTenders' | 'companies';

function formatMNTCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} тэрбум ₮`;
  }
  if (value >= 1_000_000) {
    return `${Math.round(value / 1_000_000)} сая ₮`;
  }
  return `${value.toLocaleString('mn-MN')} ₮`;
}

/** Counts up to `value` when it scrolls into view (respects reduced motion). */
function Counter({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 1100;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, reducedMotion]);

  return <span ref={ref}>{format(display)}</span>;
}

/**
 * 3-column stats strip with vertical dividers — real numbers from the DB
 * (total budget of open tenders / open tender count / registered companies).
 */
export function StatsStrip({
  openBudget,
  openTenders,
  companies,
}: {
  openBudget: number;
  openTenders: number;
  companies: number;
}) {
  const values: Record<StatKey, number> = { openBudget, openTenders, companies };

  return (
    <motion.section
      {...scrollReveal}
      aria-label={mn.landing.stats.map((stat) => stat.label).join(', ')}
      className="border-y border-border"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {mn.landing.stats.map((stat) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="px-4 py-8 text-center sm:px-6 sm:py-10"
          >
            <p className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              <Counter
                value={values[stat.key as StatKey]}
                format={
                  stat.key === 'openBudget' ? formatMNTCompact : (n) => n.toLocaleString('mn-MN')
                }
              />
            </p>
            <p className="mt-2 text-sm font-bold text-text">{stat.label}</p>
            <p className="mt-1 text-xs text-muted">{stat.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
