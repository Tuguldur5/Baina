import Link from 'next/link';
import type { ReactNode } from 'react';
import { adminHref } from '@/lib/hosts';
import { mn } from '@/lib/i18n/mn';

/**
 * Page header used by every admin page (spec A4).
 *
 *   breadcrumb (muted)  >  title (22px semibold) + subtitle
 *   actions on the right
 *   optional underline tabs for in-page filters
 *
 * Server component: pages pass plain nodes, no interactivity is required here.
 */

export type HeaderTab = { href: string; label: string; active: boolean };

export function AdminPageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
  tabs,
}: {
  title: string;
  subtitle?: string;
  /** Muted trail above the title; the last crumb is the current page. */
  breadcrumb?: string[];
  actions?: ReactNode;
  tabs?: HeaderTab[];
}) {
  const crumbs = breadcrumb ?? [mn.admin.page.home];

  return (
    <header className="mb-6">
      <nav aria-label="breadcrumb" className="mb-2 flex items-center gap-1.5 text-[11.5px] text-a-muted">
        <Link href={adminHref('/')} className="transition-colors hover:text-a-ink">
          {mn.admin.page.home}
        </Link>
        {crumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            <span className={index === crumbs.length - 1 ? 'text-a-ink' : undefined}>{crumb}</span>
          </span>
        ))}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight text-a-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-[12.5px] text-a-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {tabs && tabs.length > 0 && (
        <div className="mt-4 flex items-center gap-1 border-b border-a-border">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={adminHref(tab.href)}
              aria-current={tab.active ? 'page' : undefined}
              className={
                tab.active
                  ? '-mb-px border-b-2 border-a-primary px-3 pb-2 text-[12.5px] font-semibold text-a-ink'
                  : '-mb-px border-b-2 border-transparent px-3 pb-2 text-[12.5px] font-medium text-a-muted transition-colors hover:text-a-ink'
              }
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
