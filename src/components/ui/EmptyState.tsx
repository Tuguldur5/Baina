'use client';

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

/** Empty state with icon + message + optional CTA. */
export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-16 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-muted">
        {icon ?? <Inbox className="h-7 w-7" aria-hidden="true" />}
      </span>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action &&
        (action.href ? (
          <Link href={action.href} className="mt-2">
            <Button variant="primary" size="md">
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="md" onClick={action.onClick} className="mt-2">
            {action.label}
          </Button>
        ))}
    </motion.div>
  );
}
