import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { mn } from '@/lib/i18n/mn';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getAdminStats } from '@/lib/admin/queries';
import { adminHref } from '@/lib/hosts';
import { AdminOverviewComposer } from '@/components/admin/AdminOverviewComposer';
import { AdminKpiStrip } from '@/components/admin/AdminKpiStrip';
import { AdminCharts } from '@/components/admin/AdminCharts';
import { AdminWorkQueue } from '@/components/admin/AdminWorkQueue';

export const metadata: Metadata = { title: mn.admin.nav.overview };

/**
 * Overview (spec A5) — the Freebuff home view, light.
 *
 * Watermark + greeting, a real banner card, the command composer, then KPI
 * strip, charts and the moderation queue. Every figure comes from
 * `admin_stats()`; when a count is zero the card says so instead of inventing
 * a placeholder number.
 */
export default async function AdminOverviewPage() {
  const session = await requireAdmin();
  const stats = await getAdminStats();
  const { totals } = stats;

  const attention = totals.openReports + totals.suspendedUsers;
  const allClear = attention === 0;

  return (
    <div>
      {/* Faint logo watermark + greeting */}
      <div className="relative mb-6 flex flex-col items-center pt-4 text-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-2 select-none text-[120px] font-extrabold leading-none text-a-faint"
        >
          бн
        </span>
        <h1 className="relative mt-14 text-[22px] font-semibold text-a-ink">
          {mn.admin.overview.greeting}
          {session.name ? `, ${session.name}` : ''}
        </h1>
        <p className="relative mt-1 text-[12.5px] text-a-muted">{mn.admin.overview.intro}</p>
      </div>

      {/* Banner card — real counts, blue "Шалгах" link */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] px-4 py-3 shadow-a-soft">
        <span
          className={
            allClear
              ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-a-success-tint text-a-success'
              : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-a-warning-tint text-a-warning'
          }
        >
          {allClear ? (
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-a-ink">
            {allClear ? mn.admin.overview.bannerAllClear : mn.admin.overview.bannerTitle}
          </p>
          <p className="mt-0.5 text-[12px] text-a-muted">
            {allClear
              ? `${totals.openTenders} ${mn.admin.overview.kpiActiveTenders.toLowerCase()}`
              : [
                  totals.openReports > 0
                    ? `${totals.openReports} ${mn.admin.overview.bannerReports}`
                    : null,
                  totals.suspendedUsers > 0
                    ? `${totals.suspendedUsers} ${mn.admin.overview.bannerSuspended}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
        </div>

        {!allClear && (
          <Link
            href={adminHref('/reports')}
            className="shrink-0 text-[12.5px] font-semibold text-a-info underline-offset-2 hover:underline"
          >
            {mn.admin.overview.bannerLink} →
          </Link>
        )}
      </div>

      {/* Command composer */}
      <AdminOverviewComposer />

      {/* KPI strip */}
      <AdminKpiStrip totals={totals} />

      {/* Charts */}
      <AdminCharts stats={stats} />

      {/* Moderation queue */}
      <AdminWorkQueue totals={totals} />
    </div>
  );
}
