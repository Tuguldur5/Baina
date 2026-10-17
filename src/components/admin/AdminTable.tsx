import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared list primitives for the admin panel (measured in the A4/A5 palette).
 *
 * Every admin list page renders the same surface: a card that scrolls
 * horizontally on narrow screens, a muted uppercase header row and one line per
 * record. Keeping the markup here means the five list pages cannot drift apart,
 * and no page has to re-derive the `a-*` classes.
 *
 * Server components — none of these are interactive. Sorting/filtering is done
 * in the QUERY (see src/lib/admin/queries.ts), never in the browser.
 */

export type AdminTableRow = {
  /** Stable key: the record's real id. */
  id: string;
  cells: ReactNode[];
};

export function AdminTable({
  caption,
  columns,
  rows,
}: {
  /** Screen-reader caption — the page header carries the visible title. */
  caption: string;
  columns: string[];
  rows: AdminTableRow[];
}) {
  return (
    <div className="overflow-x-auto rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] shadow-a-soft">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-a-border">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-a-muted"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-a-border last:border-0 hover:bg-a-faint/60"
            >
              {row.cells.map((cell, index) => (
                <td key={index} className="px-4 py-2.5 align-middle text-[12.5px] text-a-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type AdminPillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const PILL_TONES: Record<AdminPillTone, string> = {
  neutral: 'bg-a-faint text-a-muted',
  info: 'bg-a-info-tint text-a-info',
  success: 'bg-a-success-tint text-a-success',
  warning: 'bg-a-warning-tint text-a-warning',
  danger: 'bg-a-danger-tint text-a-danger',
};

/**
 * Small status chip. The caller passes the tone explicitly because the same
 * code means different things in different tables ('open' is a healthy tender
 * but an unattended report).
 */
export function AdminStatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: AdminPillTone;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        PILL_TONES[tone]
      )}
    >
      {label}
    </span>
  );
}

/** Muted secondary text (dates, ids, hints) that stays readable in a cell. */
export function AdminMuted({ children }: { children: ReactNode }) {
  return <span className="text-[11.5px] text-a-muted">{children}</span>;
}
