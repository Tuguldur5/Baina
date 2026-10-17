'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';
import { adminHref } from '@/lib/hosts';
import { mn } from '@/lib/i18n/mn';

export type ActivityEntry = {
  id: string;
  action: string;
  entityType: string | null;
  createdAt: string;
};

/**
 * Right panel (spec A4): the latest real `audit_logs` entries.
 *
 * Nothing here is invented — if the log is empty the panel says so. Action
 * codes come straight from the database (`reveal_email`, `set_user_status`,
 * `broadcast_notification`, ...); unknown codes are shown verbatim rather than
 * being mapped to a misleading friendly label.
 */

/** Relative Mongolian time, e.g. "5 мин өмнө", "2 өдөр өмнө". */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'дөнгөж сая';
  if (min < 60) return `${min} мин өмнө`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} цаг өмнө`;
  const days = Math.floor(hours / 24);
  return `${days} өдөр өмнө`;
}

export function AdminActivityPanel({ entries }: { entries: ActivityEntry[] }) {
  return (
    <div className="mr-2 mb-2 flex h-full w-[320px] flex-col rounded-a-panel border border-a-border bg-[rgb(var(--a-panel))] shadow-a-soft">
      <div className="flex items-center justify-between border-b border-a-border px-4 py-3">
        <h2 className="text-[13px] font-semibold text-a-ink">{mn.admin.activity.title}</h2>
        <Link
          href={adminHref('/audit-log')}
          className="text-[11.5px] font-semibold text-a-info hover:underline"
        >
          {mn.admin.activity.viewAll}
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <Activity className="h-6 w-6 text-a-muted" strokeWidth={1.75} aria-hidden="true" />
          <p className="text-[12.5px] text-a-muted">{mn.admin.activity.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col overflow-y-auto p-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-0.5 rounded-a px-2.5 py-2 transition-colors hover:bg-a-faint"
            >
              <span className="truncate text-[12.5px] font-medium text-a-ink">
                {entry.action}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-a-muted">
                {entry.entityType && <span className="truncate">{entry.entityType}</span>}
                <span className="ml-auto shrink-0">{relativeTime(entry.createdAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
