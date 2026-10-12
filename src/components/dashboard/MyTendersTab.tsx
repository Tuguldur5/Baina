'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Search, Users, X } from 'lucide-react';
import { TenderStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DeadlineCountdown } from '@/components/tenders/DeadlineCountdown';
import { categoryGradient, categoryIcon } from '@/lib/categories';
import { staggerContainer, fadeInUp } from '@/lib/animations';
import { cn, formatDate, formatMNT } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';
import type { TenderWithOwner } from '@/lib/types/index';

type StatusFilter = '' | 'open' | 'closed' | 'awarded';
type SortKey = 'newest' | 'deadline' | 'budget';

/**
 * "Миний тендерүүд" — the owner's own tenders.
 *
 * The list is filtered and sorted IN THE BROWSER: the dashboard already loads
 * the owner's whole set, so a round-trip through the URL would only add
 * latency and a loading state. The bar is deliberately one compact row —
 * search, status chips, sort — because this is a glanceable control, not a
 * second search page.
 */
export function MyTendersTab({ tenders }: { tenders: TenderWithOwner[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [sort, setSort] = useState<SortKey>('newest');

  const statusChips: Array<{ value: StatusFilter; label: string }> = [
    { value: '', label: mn.dashboard.myTenders.all },
    { value: 'open', label: mn.tenderStatus.open },
    { value: 'closed', label: mn.tenderStatus.closed },
    { value: 'awarded', label: mn.tenderStatus.awarded },
  ];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = tenders.filter((tender) => {
      if (status && tender.status !== status) return false;
      if (!needle) return true;
      return (
        tender.title.toLowerCase().includes(needle) ||
        tender.category.toLowerCase().includes(needle) ||
        (tender.region ?? '').toLowerCase().includes(needle)
      );
    });

    return [...rows].sort((a, b) => {
      if (sort === 'deadline') {
        return Date.parse(a.deadline) - Date.parse(b.deadline);
      }
      if (sort === 'budget') {
        return Number(b.budget) - Number(a.budget);
      }
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  }, [tenders, query, status, sort]);

  if (tenders.length === 0) {
    return (
      <EmptyState
        title={mn.dashboard.emptyTenders.title}
        text={mn.dashboard.emptyTenders.text}
        action={{ label: mn.dashboard.emptyTenders.cta, href: '/tenders' }}
      />
    );
  }

  const activeCount = tenders.filter((tender) => tender.status === 'open').length;
  const isFiltered = Boolean(query || status);

  return (
    <div className="space-y-4">
      {/* Compact filter bar */}
      <section className="card p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:max-w-xs lg:flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              aria-label={mn.dashboard.myTenders.searchPlaceholder}
              placeholder={mn.dashboard.myTenders.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9 pr-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={mn.dashboard.myTenders.clear}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="-mx-1 flex flex-1 items-center gap-2 overflow-x-auto px-1 pb-1 lg:pb-0">
            {statusChips.map((chip) => {
              const active = status === chip.value;
              return (
                <button
                  key={chip.value || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatus(chip.value)}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-navy text-white dark:bg-white dark:text-navy'
                      : 'bg-surface-2 text-muted hover:text-text'
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <label
              htmlFor="my-tenders-sort"
              className="hidden shrink-0 text-xs font-medium text-muted sm:block"
            >
              {mn.dashboard.myTenders.sortLabel}
            </label>
            <div className="w-full sm:w-44">
              <Select
                id="my-tenders-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                options={[
                  { value: 'newest', label: mn.dashboard.myTenders.sortNewest },
                  { value: 'deadline', label: mn.dashboard.myTenders.sortDeadline },
                  { value: 'budget', label: mn.dashboard.myTenders.sortBudget },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted">
          <span className="font-medium">
            {mn.dashboard.myTenders.summary(tenders.length, activeCount)}
          </span>
          <span role="status" className="flex items-center gap-2">
            {isFiltered && (
              <span>{mn.dashboard.myTenders.results(filtered.length)}</span>
            )}
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setStatus('');
                }}
                className="rounded-full px-2 py-0.5 font-semibold text-primary-600 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-primary-400 dark:hover:bg-primary-950"
              >
                {mn.dashboard.myTenders.clear}
              </button>
            )}
          </span>
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          title={mn.dashboard.myTenders.filtered.title}
          text={mn.dashboard.myTenders.filtered.text}
        />
      ) : (
        <motion.ul
          key={`${status}-${sort}-${query}`}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {filtered.map((tender) => {
            const Icon = categoryIcon(tender.category);
            const hasProposals = tender.proposalsCount > 0;

            return (
              <motion.li key={tender.id} variants={fadeInUp}>
                <Link
                  href={`/tenders/${tender.id}`}
                  className="card group flex flex-col gap-4 p-4 transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:p-5"
                >
                  {/* Identity */}
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ring-1 ring-inset ring-white/25',
                        categoryGradient(tender.category)
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {tender.title}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span>{tender.category}</span>
                        {tender.region && <span>· {tender.region}</span>}
                        <span>· {formatDate(tender.createdAt)}</span>
                      </p>
                      {/* Who joined — the number the owner actually cares about */}
                      <p
                        className={cn(
                          'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                          hasProposals
                            ? 'bg-info-50 text-info-700 dark:bg-info-950 dark:text-info-300'
                            : 'bg-surface-2 text-muted'
                        )}
                      >
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        {hasProposals
                          ? mn.dashboard.myTenders.proposals(tender.proposalsCount)
                          : mn.dashboard.myTenders.noProposals}
                      </p>
                    </div>
                  </div>

                  {/* Figures */}
                  <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                    <div className="min-w-0 sm:text-right">
                      <p className="font-semibold text-primary-600 dark:text-primary-400">
                        {formatMNT(tender.budget)}
                      </p>
                      <div className="mt-1">
                        <DeadlineCountdown deadline={tender.deadline} />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <TenderStatusBadge status={tender.status} />
                      <ArrowRight
                        className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}
