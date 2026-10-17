import { Construction } from 'lucide-react';
import { mn } from '@/lib/i18n/mn';

/**
 * Honest placeholder for admin sections whose data layer does not exist yet.
 *
 * Deliberately not a fake dashboard: no invented numbers, no lorem metrics. The
 * route, the access control, the breadcrumb and the navigation entry are real
 * (so nothing is a dead link), and the panel says plainly that the content
 * arrives in a later step.
 */
export function AdminNotBuilt({ note }: { note?: string }) {
  return (
    <div className="rounded-a-card border border-a-border bg-a-faint/60 px-6 py-10 text-center">
      <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--a-panel))] text-a-muted">
        <Construction className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="text-[13.5px] font-semibold text-a-ink">{mn.admin.page.notBuiltTitle}</p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] text-a-muted">
        {note ?? mn.admin.page.notBuiltText}
      </p>
    </div>
  );
}

/** Neutral empty state for a section that has data but currently none. */
export function AdminEmpty({ title, text }: { title?: string; text?: string }) {
  return (
    <div className="rounded-a-card border border-a-border px-6 py-10 text-center">
      <p className="text-[13.5px] font-semibold text-a-ink">{title ?? mn.admin.page.emptyTitle}</p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] text-a-muted">
        {text ?? mn.admin.page.emptyText}
      </p>
    </div>
  );
}
