import Link from 'next/link';
import { AlertTriangle, CheckCircle2, UserMinus } from 'lucide-react';
import { mn } from '@/lib/i18n/mn';
import { adminHref } from '@/lib/hosts';
import type { AdminStatsTotals } from '@/lib/admin/queries';

/**
 * "Хийх зүйлс" queue (spec A5).
 *
 * Only real, actionable counts: open reports and suspended accounts. When both
 * are zero the card shows a teal all-clear line instead of an empty list.
 */
export function AdminWorkQueue({ totals }: { totals: AdminStatsTotals }) {
  const items = [
    totals.openReports > 0
      ? {
          key: 'reports',
          icon: AlertTriangle,
          tone: 'warning' as const,
          label: `${totals.openReports} ${mn.admin.overview.bannerReports}`,
          href: '/reports',
        }
      : null,
    totals.suspendedUsers > 0
      ? {
          key: 'suspended',
          icon: UserMinus,
          tone: 'danger' as const,
          label: `${totals.suspendedUsers} ${mn.admin.overview.bannerSuspended}`,
          href: '/users',
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: typeof AlertTriangle;
    tone: 'warning' | 'danger';
    label: string;
    href: string;
  }>;

  return (
    <section className="rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] p-4 shadow-a-soft">
      <h2 className="mb-3 text-[13px] font-semibold text-a-ink">{mn.admin.overview.queueTitle}</h2>

      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-[12.5px] font-medium text-a-success">
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          {mn.admin.overview.queueEmpty}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={adminHref(item.href)}
                className="flex items-center gap-2.5 rounded-a px-2.5 py-2 transition-colors hover:bg-a-faint"
              >
                <span
                  className={
                    item.tone === 'danger'
                      ? 'flex h-7 w-7 items-center justify-center rounded-full bg-a-danger-tint text-a-danger'
                      : 'flex h-7 w-7 items-center justify-center rounded-full bg-a-warning-tint text-a-warning'
                  }
                >
                  <item.icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="text-[12.5px] font-medium text-a-ink">{item.label}</span>
                <span className="ml-auto text-[11.5px] font-semibold text-a-info">
                  {mn.admin.overview.bannerLink} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
