'use client';

import type { HTMLAttributes } from 'react';
import { motion, type MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props} />;
}

/** Card that lifts on hover (y: -4 + stronger shadow). */
export function HoverCard({
  className,
  children,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'onDrag'> & MotionProps) {
  return (
    <motion.div
      whileHover={{ y: -4, shadow: '0 16px 40px -12px rgb(15 23 42 / 0.18)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={cn('card transition-shadow', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
