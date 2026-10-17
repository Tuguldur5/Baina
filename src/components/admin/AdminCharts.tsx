import { mn } from '@/lib/i18n/mn';
import type { AdminStats } from '@/lib/admin/queries';
import { AdminEmpty } from '@/components/admin/AdminNotBuilt';

/**
 * Overview charts (spec A5) — plain SVG + CSS only, no chart library.
 *
 * Every chart carries `role="img"` plus a text summary so the data is
 * reachable without sight. Series colours are the scoped admin tokens:
 * orange (--a-primary) and ink (--a-ink), with the donut using teal + info.
 */

/** Line/area chart: new registrations vs new tenders over the 30-day window. */
function RegistrationsChart({ data }: { data: AdminStats['series'] }) {
  if (data.length === 0) {
    return <AdminEmpty title={mn.admin.overview.chartRegistrations} text={mn.admin.page.emptyText} />;
  }

  const width = 720;
  const height = 200;
  const padX = 8;
  const padY = 12;
  const max = Math.max(1, ...data.map((d) => Math.max(d.users, d.tenders)));
  const stepX = (width - padX * 2) / Math.max(1, data.length - 1);

  const toPath = (pick: (d: AdminStats['series'][number]) => number) =>
    data
      .map((d, i) => {
        const x = padX + i * stepX;
        const y = height - padY - (pick(d) / max) * (height - padY * 2);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  const usersPath = toPath((d) => d.users);
  const tendersPath = toPath((d) => d.tenders);
  const areaPath = `${usersPath} L${(padX + (data.length - 1) * stepX).toFixed(1)},${height - padY} L${padX},${height - padY} Z`;

  const totalUsers = data.reduce((sum, d) => sum + d.users, 0);
  const totalTenders = data.reduce((sum, d) => sum + d.tenders, 0);

  return (
    <div className="rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] p-4 shadow-a-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-a-ink">
          {mn.admin.overview.chartRegistrations}
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-a-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-a-primary" aria-hidden="true" />
            {mn.admin.overview.kpiUsers} ({totalUsers})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-a-ink" aria-hidden="true" />
            {mn.admin.overview.composerTenders} ({totalTenders})
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-48 w-full"
        role="img"
        aria-label={`${mn.admin.overview.chartRegistrations}: ${mn.admin.overview.kpiUsers} ${totalUsers}, ${mn.admin.overview.composerTenders} ${totalTenders}`}
        preserveAspectRatio="none"
      >
        <path d={areaPath} fill="rgb(var(--a-primary) / 0.12)" stroke="none" />
        <path d={tendersPath} fill="none" stroke="rgb(var(--a-ink))" strokeWidth={1.75} />
        <path d={usersPath} fill="none" stroke="rgb(var(--a-primary))" strokeWidth={2} />
      </svg>
      <p className="mt-1 text-[11px] text-a-muted">{mn.admin.overview.chartRegistrationsHint}</p>
    </div>
  );
}

/** Dark ink accent card: awarded tenders + a small sparkline. */
function SummaryCard({ stats }: { stats: AdminStats }) {
  const awarded = stats.totals.awardedTenders;
  const values = stats.series.map((d) => d.tenders);
  const max = Math.max(1, ...values);
  const spark = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${i * 4},${28 - (v / max) * 26}`)
    .join(' ');

  return (
    <div className="flex flex-col justify-between rounded-a-card bg-a-ink p-4 shadow-a-soft">
      <p className="text-[12px] font-medium text-white/70">{mn.admin.overview.summaryTitle}</p>
      <div>
        <p className="mt-2 text-[32px] font-semibold leading-none text-a-success">{awarded}</p>
        <p className="mt-1 text-[11.5px] text-white/70">{mn.admin.overview.summaryAwarded}</p>
      </div>
      {values.length > 1 && (
        <svg
          viewBox="0 0 120 30"
          className="mt-3 h-8 w-full"
          role="img"
          aria-label={`${mn.admin.overview.summaryAwarded}: ${awarded}`}
          preserveAspectRatio="none"
        >
          <path d={spark} fill="none" stroke="rgb(var(--a-success))" strokeWidth={1.5} />
        </svg>
      )}
    </div>
  );
}

/** Donut: individual vs company tenders. */
function OwnerDonut({ split }: { split: AdminStats['ownerSplit'] }) {
  const total = split.user + split.company;
  if (total === 0) {
    return (
      <div className="rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] p-4 shadow-a-soft">
        <h2 className="mb-3 text-[13px] font-semibold text-a-ink">{mn.admin.overview.donutTitle}</h2>
        <AdminEmpty text={mn.admin.page.emptyText} />
      </div>
    );
  }

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const companyFraction = split.company / total;
  const companyLen = circumference * companyFraction;

  return (
    <div className="rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] p-4 shadow-a-soft">
      <h2 className="mb-3 text-[13px] font-semibold text-a-ink">{mn.admin.overview.donutTitle}</h2>
      <div className="flex items-center gap-4">
        <svg
          viewBox="0 0 140 140"
          className="h-32 w-32 shrink-0"
          role="img"
          aria-label={`${mn.admin.overview.donutIndividual} ${split.user}, ${mn.admin.overview.donutCompany} ${split.company}`}
        >
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="rgb(var(--a-info))"
            strokeWidth={16}
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="rgb(var(--a-success))"
            strokeWidth={16}
            strokeDasharray={`${companyLen} ${circumference - companyLen}`}
            strokeDashoffset={circumference / 4}
            transform="rotate(-90 70 70)"
          />
          <text
            x="70"
            y="76"
            textAnchor="middle"
            className="fill-[rgb(var(--a-ink))] text-[18px] font-semibold"
          >
            {total}
          </text>
        </svg>
        <ul className="flex flex-col gap-2 text-[12px]">
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-a-info" aria-hidden="true" />
            <span className="text-a-muted">{mn.admin.overview.donutIndividual}</span>
            <span className="font-semibold text-a-ink">{split.user}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-a-success" aria-hidden="true" />
            <span className="text-a-muted">{mn.admin.overview.donutCompany}</span>
            <span className="font-semibold text-a-ink">{split.company}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Bar chart: tenders per category (orange bars with ink caps). */
function CategoryBars({ data }: { data: AdminStats['topCategories'] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] p-4 shadow-a-soft">
        <h2 className="mb-3 text-[13px] font-semibold text-a-ink">{mn.admin.overview.barTitle}</h2>
        <AdminEmpty text={mn.admin.page.emptyText} />
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count));

  return (
    <div className="rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] p-4 shadow-a-soft">
      <h2 className="mb-3 text-[13px] font-semibold text-a-ink">{mn.admin.overview.barTitle}</h2>
      <ul className="flex flex-col gap-2.5">
        {data.map((row) => (
          <li key={row.category} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-[11.5px] text-a-muted">
              {row.category}
            </span>
            <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-a-faint">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-a-primary"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </span>
            <span className="w-6 shrink-0 text-right text-[11.5px] font-semibold text-a-ink">
              {row.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminCharts({ stats }: { stats: AdminStats }) {
  return (
    <div className="mb-5 flex flex-col gap-4">
      <RegistrationsChart data={stats.series} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SummaryCard stats={stats} />
        <OwnerDonut split={stats.ownerSplit} />
      </div>

      <CategoryBars data={stats.topCategories} />
    </div>
  );
}
