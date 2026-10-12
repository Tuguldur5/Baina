import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gavel,
  Rocket,
  Target,
  Trophy,
  Wallet,
} from 'lucide-react';
import { DeadlineCountdown } from '@/components/tenders/DeadlineCountdown';
import { cn, formatDayMonth, formatMNT, formatNumber } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';
import type { DashboardAnalytics } from '@/lib/supabase/queries';

const t = mn.dashboard.analytics;

const STATUS_TONES = {
  open: 'bg-accent-500',
  closed: 'bg-muted',
  awarded: 'bg-info-500',
} as const;

const KPI_TONES = {
  primary: 'text-primary-600 bg-primary-50 dark:bg-primary-950',
  info: 'text-info-700 bg-info-50 dark:bg-info-950',
  accent: 'text-accent-700 bg-accent-50 dark:bg-accent-950',
  neutral: 'text-muted bg-surface-2',
} as const;

/**
 * "Шинжилгээний самбар" — everything a tender owner (and a bidder) needs to
 * understand at a glance, in ONE screen, before the detail tabs:
 *
 *   1. six KPI tiles,
 *   2. a 14-day bar chart of received proposals next to the tender-status split,
 *   3. the two things that need a decision today: tenders closing within a week
 *      and open tenders nobody has bid on, plus a leaderboard of the tenders with
 *      the most bids,
 *   4. the bidder side — win rate and the status of the viewer's own bids.
 *
 * The charts are plain CSS bars: no charting dependency is installed, and a
 * 14-column bar chart does not need one. Every bar still carries its value in a
 * title + an sr-only list, so the numbers are available without the colours.
 */
export function AnalyticsOverview({ data }: { data: DashboardAnalytics }) {
  const kpis = [
    {
      key: 'totalTenders',
      label: t.kpi.totalTenders,
      value: formatNumber(data.tenders.total),
      hint: t.kpiHint.totalTenders(data.tenders.open, data.tenders.closed),
      icon: Rocket,
      tone: KPI_TONES.primary,
    },
    {
      key: 'openTenders',
      label: t.kpi.openTenders,
      value: formatNumber(data.tenders.open),
      hint: t.kpiHint.openTenders(data.closingSoon.length),
      icon: Clock,
      tone: KPI_TONES.info,
    },
    {
      key: 'receivedProposals',
      label: t.kpi.receivedProposals,
      value: formatNumber(data.received.total),
      hint: t.kpiHint.receivedProposals(data.received.pending),
      icon: Gavel,
      tone: KPI_TONES.accent,
    },
    {
      key: 'avgProposals',
      label: t.kpi.avgProposals,
      value: data.avgProposals.toFixed(1),
      hint: t.kpiHint.avgProposals(data.responseRate),
      icon: Target,
      tone: KPI_TONES.neutral,
    },
    {
      key: 'openBudget',
      label: t.kpi.openBudget,
      value: formatMNT(data.budget.open),
      hint: t.kpiHint.openBudget,
      icon: Wallet,
      tone: KPI_TONES.primary,
    },
    {
      key: 'myBids',
      label: t.kpi.myBids,
      value: formatNumber(data.bids.total),
      hint: t.kpiHint.myBids(data.bids.accepted, data.winRate),
      icon: Trophy,
      tone: KPI_TONES.accent,
    },
  ] as const;

  const maxDaily = Math.max(1, ...data.trend.map((day) => day.count));
  const statusRows = [
    { key: 'open', label: mn.tenderStatus.open, count: data.tenders.open },
    { key: 'closed', label: mn.tenderStatus.closed, count: data.tenders.closed },
    { key: 'awarded', label: mn.tenderStatus.awarded, count: data.tenders.awarded },
  ] as const;
  const maxTop = Math.max(1, ...data.topTenders.map((row) => row.proposals));

  return (
    <section aria-labelledby="analytics-title" className="space-y-4">
      <h2 id="analytics-title" className="sr-only">
        {t.kpi.totalTenders}
      </h2>

      {/* 1 — KPI tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((card) => (
          <div key={card.key} className="card p-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                  card.tone
                )}
              >
                <card.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="truncate text-xs font-medium text-muted">
                {card.label}
              </p>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-text">
              {card.value}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">{card.hint}</p>
          </div>
        ))}
      </div>

      {/* 2 — trend + status split */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-sm font-semibold text-text">{t.trend.title}</h3>
            <p className="text-xs text-muted">
              {t.trend.caption(data.trend.length, data.trendTotal)}
            </p>
          </div>

          {data.trendTotal === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              {t.trend.empty}
            </p>
          ) : (
            <>
              <div
                role="img"
                aria-label={t.trend.caption(data.trend.length, data.trendTotal)}
                className="mt-5 flex h-32 items-end gap-1"
              >
                {data.trend.map((day) => (
                  <div
                    key={day.date}
                    title={t.trend.day(formatDayMonth(day.date), day.count)}
                    className="flex h-full flex-1 flex-col justify-end"
                  >
                    <span
                      className={cn(
                        'w-full rounded-t transition-colors',
                        day.count > 0
                          ? 'bg-primary-400 hover:bg-primary-500'
                          : 'bg-border'
                      )}
                      style={{
                        height: day.count
                          ? `${Math.max(8, Math.round((day.count / maxDaily) * 100))}%`
                          : '4px',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-muted">
                <span>{formatDayMonth(data.trend[0].date)}</span>
                <span>
                  {formatDayMonth(data.trend[data.trend.length - 1].date)}
                </span>
              </div>
              <ul className="sr-only">
                {data.trend.map((day) => (
                  <li key={day.date}>
                    {t.trend.day(formatDayMonth(day.date), day.count)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-text">{t.status.title}</h3>
          <p className="mt-1 text-xs text-muted">{t.status.caption}</p>

          {data.tenders.total === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              {t.status.empty}
            </p>
          ) : (
            <>
              <div
                role="img"
                aria-label={statusRows
                  .map((row) =>
                    t.status.legend(
                      row.label,
                      row.count,
                      Math.round((row.count / data.tenders.total) * 100)
                    )
                  )
                  .join(', ')}
                className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-surface-2"
              >
                {statusRows.map((row) =>
                  row.count > 0 ? (
                    <span
                      key={row.key}
                      className={cn('h-full', STATUS_TONES[row.key])}
                      style={{ width: `${(row.count / data.tenders.total) * 100}%` }}
                    />
                  ) : null
                )}
              </div>
              <dl className="mt-5 space-y-3">
                {statusRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <dt className="flex items-center gap-2 text-muted">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'h-2.5 w-2.5 rounded-full',
                          STATUS_TONES[row.key]
                        )}
                      />
                      {row.label}
                    </dt>
                    <dd className="font-semibold tabular-nums text-text">
                      {row.count}
                      <span className="ml-1.5 text-xs font-normal text-muted">
                        {Math.round((row.count / data.tenders.total) * 100)}%
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
      </div>

      {/* 3 — what needs a decision + leaderboard */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-600" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text">{t.attention.title}</h3>
          </div>
          <p className="mt-1 text-xs text-muted">{t.attention.caption}</p>

          {data.closingSoon.length === 0 && data.noProposals.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted">
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-accent-600"
                aria-hidden="true"
              />
              {t.attention.empty}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.closingSoon.map((row) => (
                <li key={`close-${row.id}`}>
                  <Link
                    href={`/tenders/${row.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-warning-200 bg-warning-50/60 px-3 py-2.5 transition-colors hover:border-warning-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-warning-900 dark:bg-warning-950/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text">
                        {row.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-warning-700 dark:text-warning-300">
                        {t.attention.closingSoon} · {t.proposals(row.proposals)}
                      </span>
                    </span>
                    <DeadlineCountdown
                      deadline={row.deadline}
                      className="shrink-0 whitespace-nowrap text-xs font-semibold text-warning-700 dark:text-warning-300"
                    />
                  </Link>
                </li>
              ))}
              {data.noProposals.map((row) => (
                <li key={`empty-${row.id}`}>
                  <Link
                    href={`/tenders/${row.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5 transition-colors hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text">
                        {row.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {t.attention.noProposals} · {formatMNT(row.budget)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">
                      {mn.tenderStatus.open}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary-500" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text">{t.top.title}</h3>
          </div>
          <p className="mt-1 text-xs text-muted">{t.top.caption}</p>

          {data.topTenders.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              {t.top.empty}
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {data.topTenders.map((row, index) => (
                <li key={row.id}>
                  <Link
                    href={`/tenders/${row.id}`}
                    className="group block rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0 flex items-center gap-2">
                        <span className="w-5 shrink-0 text-xs font-bold tabular-nums text-muted">
                          {index + 1}
                        </span>
                        <span className="truncate text-sm font-medium text-text group-hover:text-primary-600 dark:group-hover:text-primary-400">
                          {row.title}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-muted">
                        {t.proposals(row.proposals)}
                      </span>
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 pl-7">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full bg-primary-500"
                          style={{
                            width: `${Math.max(6, (row.proposals / maxTop) * 100)}%`,
                          }}
                        />
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {formatMNT(row.budget)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* 4 — the bidder side */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text">{t.bidder.title}</h3>
        <p className="mt-1 text-xs text-muted">{t.bidder.caption}</p>

        {data.bids.total === 0 ? (
          <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-dashed border-border px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">{t.bidder.empty}</p>
            <Link
              href="/tenders"
              className="inline-flex h-9 shrink-0 items-center rounded-full bg-primary-500 px-4 text-sm font-semibold text-navy transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t.bidder.cta}
            </Link>
          </div>
        ) : (
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(
              [
                { key: 'total', label: t.bidder.total, value: formatNumber(data.bids.total) },
                { key: 'pending', label: t.bidder.pending, value: formatNumber(data.bids.pending) },
                { key: 'shortlisted', label: t.bidder.shortlisted, value: formatNumber(data.bids.shortlisted) },
                { key: 'won', label: t.bidder.won, value: formatNumber(data.bids.accepted) },
                { key: 'winRate', label: t.bidder.winRate, value: `${data.winRate}%` },
              ] as const
            ).map((cell) => (
              <div key={cell.key} className="rounded-xl bg-surface-2 px-3 py-2.5">
                <dt className="text-[11px] font-medium text-muted">{cell.label}</dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-text">
                  {cell.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
