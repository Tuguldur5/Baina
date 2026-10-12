'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, MapPin } from 'lucide-react';
import { TenderStatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { DeadlineCountdown } from '@/components/tenders/DeadlineCountdown';
import { categoryGradient, categoryIcon } from '@/lib/categories';
import { cn, formatDate, formatMNT } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';
import type { TenderWithOwner } from '@/lib/types/index';
import type { Variants } from 'framer-motion';

/** Stagger variants for lists of tender cards. */
export const tenderCardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

/**
 * Tender card.
 *
 * The card is FIVE rows, and every row has exactly ONE line of layout that can
 * grow, so cards in a row always end up the same height:
 *
 *   1. which category / where ——————————————— status        (identity)
 *   2. the tender NAME — the loudest thing on the card
 *   3. two lines of the public summary — clamped
 *   4. FIGURES — a single inset panel: budget (left) and the live countdown
 *      (right), laid out with flex-wrap so a long number or a long countdown
 *      drops onto its own line instead of being squeezed
 *   5. poster, proposal count and date
 *
 * Row 4 used to be a three-column grid of uppercase labels with a fixed 33px
 * label box. What the browser actually painted was: labels reserving dead
 * space, the countdown (≈130px of text) forced into a ≈97px column and therefore
 * ALWAYS wrapping onto two lines, and the budget being ellipsised
 * (`₮ 6,500,000` → `₮ 6,500,0…`) on narrower cards. One inset panel with two
 * nowrap figures removes all three problems and reads as designed content
 * instead of three cramped cells.
 */
export function TenderCard({ tender }: { tender: TenderWithOwner }) {
  const Icon = categoryIcon(tender.category);

  return (
    <motion.article variants={tenderCardVariants} className="h-full">
      <Link
        href={`/tenders/${tender.id}`}
        className="card-gradient group relative flex h-full flex-col overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:border-primary-800"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-brand-tender/20 blur-3xl"
        />

        {/* 1 — identity */}
        <div className="relative flex items-center gap-3">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ring-1 ring-inset ring-white/25',
              categoryGradient(tender.category)
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text">
            {tender.category}
            {tender.region && (
              <span className="font-normal text-muted">
                {' · '}
                <span className="inline-flex items-center gap-1 align-[-2px]">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {tender.region}
                </span>
              </span>
            )}
          </span>
          <span className="shrink-0">
            <TenderStatusBadge status={tender.status} />
          </span>
        </div>

        {/* 2 — the tender name */}
        <h3 className="relative mt-4 line-clamp-2 text-lg font-bold leading-snug tracking-tight text-text transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
          {tender.title}
        </h3>
        

        {/* 4 + 5 — figures panel and meta, pinned to the bottom of the card */}
        <div className="relative mt-auto">
          <dl className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 rounded-xl border border-border/70 bg-surface-2/60 px-3.5 py-3">
            <div>
              <dt className="text-[11px] font-medium leading-4 text-muted">
                {mn.tenders.labels.budget}
              </dt>
              <dd className="mt-0.5 whitespace-nowrap text-base font-bold tracking-tight text-primary-600 dark:text-primary-400">
                {formatMNT(tender.budget)}
              </dd>
            </div>
            <div className="text-right">
              <dt className="text-[11px] font-medium leading-4 text-muted">
                {mn.tenders.labels.deadline}
              </dt>
              <dd className="mt-0.5">
                <DeadlineCountdown
                  deadline={tender.deadline}
                  className="justify-end whitespace-nowrap text-[13px] font-medium"
                />
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
            <span className="flex min-w-0 items-center gap-2">
              <Avatar
                src={tender.owner?.avatarUrl ?? null}
                name={tender.owner?.name ?? '?'}
                size="sm"
              />
              <span className="truncate font-medium">
                {tender.owner?.name ?? '—'}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 font-semibold"
                title={mn.tenderDetail.lockedText}
              >
                <Lock className="h-3 w-3" aria-hidden="true" />
                {mn.tenders.proposalsShort(tender.proposalsCount)}
              </span>
              <span className="whitespace-nowrap">
                {formatDate(tender.createdAt)}
              </span>
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
