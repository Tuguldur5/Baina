'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, LockOpen } from 'lucide-react';
import {
  Badge,
  ProposalStatusBadge,
  TenderStatusBadge,
} from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { staggerContainer, fadeInUp } from '@/lib/animations';
import { formatDateTime, formatMNT } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';
import type { MyProposalItem } from '@/lib/supabase/queries';

/** "Миний саналууд" dashboard tab. */
export function MyProposalsTab({ proposals }: { proposals: MyProposalItem[] }) {
  if (proposals.length === 0) {
    return (
      <EmptyState
        title={mn.dashboard.emptyProposals.title}
        text={mn.dashboard.emptyProposals.text}
        action={{ label: mn.dashboard.emptyProposals.cta, href: '/tenders' }}
      />
    );
  }

  return (
    <motion.ul
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {proposals.map((proposal) => (
        <motion.li key={proposal.id} variants={fadeInUp}>
          <Link
            href={proposal.tender ? `/tenders/${proposal.tender.id}` : '#'}
            className="card group flex flex-col gap-3 p-5 transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-text group-hover:text-primary-600 dark:group-hover:text-primary-400">
                {proposal.tender?.title ?? mn.errors.notFoundResource}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{formatDateTime(proposal.createdAt)}</span>
                {proposal.tender && (
                  <TenderStatusBadge status={proposal.tender.status} />
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <p className="font-semibold text-primary-600 dark:text-primary-400">
                  {formatMNT(proposal.priceOffer)}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5">
                  <ProposalStatusBadge status={proposal.status} />
                  {(proposal.status === 'shortlisted' ||
                    proposal.status === 'accepted') && (
                    <Badge tone="info">
                      <LockOpen className="h-3 w-3" aria-hidden="true" />
                      {mn.dashboard.notifications.unlocked}
                    </Badge>
                  )}
                </div>
              </div>
              <ArrowRight
                className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </div>
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}
