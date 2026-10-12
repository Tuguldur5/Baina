'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/lib/animations';
import { cn } from '@/lib/utils';

/**
 * Client-side staggered entrance grid. Server pages can't render
 * framer-motion components directly, so they wrap their children here.
 */
export function StaggerGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn('grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}
    >
      {children}
    </motion.div>
  );
}
