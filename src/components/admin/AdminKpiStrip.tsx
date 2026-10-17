import { mn } from '@/lib/i18n/mn';
import { formatMNT, formatNumber } from '@/lib/utils';
import type { AdminStatsTotals } from '@/lib/admin/queries';

/**
 * KPI strip (spec A5): big numbers separated by thin vertical lines.
 *
 * Trend chips are only rendered when a real comparison exists. The overview
 * has no previous-period aggregate, so no chip is shown rather than inventing
 * a percentage — the `admin_stats()` series covers a single 30-day window.
 *
 * Numbers go through the shared `formatNumber`/`formatMNT` helpers so the
 * server HTML and the client render identically (a `toLocaleString('mn-MN')`
 * depends on the runtime's ICU data and could differ between the two).
 */
export function AdminKpiStrip({ totals }: { totals: AdminStatsTotals }) {
  const items = [
    { label: mn.admin.overview.kpiUsers, value: formatNumber(totals.users) },
    { label: mn.admin.overview.kpiActiveTenders, value: formatNumber(totals.openTenders) },
    { label: mn.admin.overview.kpiProposals, value: formatNumber(totals.proposals) },
    { label: mn.admin.overview.kpiOpenReports, value: formatNumber(totals.openReports) },
    { label: mn.admin.overview.kpiOpenBudget, value: formatMNT(totals.openBudget) },
  ];

  return (
    <section
      aria-label={mn.admin.overview.intro}
      className="mb-5 grid grid-cols-2 gap-y-4 rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] px-4 py-4 shadow-a-soft sm:grid-cols-3 lg:grid-cols-5 lg:gap-y-0"
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={
            index === 0
              ? 'px-1 lg:px-4'
              : 'border-l border-a-border px-1 lg:px-4'
          }
        >
          <p className="text-[11px] font-medium text-a-muted">{item.label}</p>
          <p className="mt-1 truncate text-[20px] font-semibold leading-none text-a-ink">
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}
