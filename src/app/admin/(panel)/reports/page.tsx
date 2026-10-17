import type { Metadata } from 'next';
import { mn } from '@/lib/i18n/mn';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getReports } from '@/lib/admin/queries';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminEmpty } from '@/components/admin/AdminNotBuilt';
import { AdminMuted, AdminStatusPill, AdminTable, type AdminPillTone } from '@/components/admin/AdminTable';
import { formatDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: mn.admin.nav.reports };

const LIMIT = 50;

const REPORT_TONES: Record<string, AdminPillTone> = {
  open: 'warning',
  reviewing: 'info',
  resolved: 'success',
  dismissed: 'neutral',
};

const REPORT_LABELS: Record<string, string> = {
  open: mn.admin.list.reportStatusOpen,
  reviewing: mn.admin.list.reportStatusReviewing,
  resolved: mn.admin.list.reportStatusResolved,
  dismissed: mn.admin.list.reportStatusDismissed,
};

const ENTITY_LABELS: Record<string, string> = {
  tender: mn.admin.list.entityTender,
  user: mn.admin.list.entityUser,
  proposal: mn.admin.list.entityProposal,
};

/**
 * Moderation queue (admin host `/reports`).
 *
 * Reads the `reports` table through its admin RLS policy. Only ids are stored
 * on a report, so the object column shows the entity type plus a short id —
 * names would need another lookup and are left to the moderation workflow.
 *
 * HONEST STATE: nothing in the app files a report yet (there is no public
 * "report" form or server action), so this list is expected to be empty. The
 * page says so rather than showing an invented queue.
 */
export default async function AdminReportsPage() {
  await requireAdmin();

  const reports = await getReports(LIMIT);

  return (
    <div>
      <AdminPageHeader
        title={mn.admin.nav.reports}
        subtitle={mn.admin.list.subtitleReports}
        breadcrumb={[mn.admin.nav.moderation, mn.admin.nav.reports]}
      />

      {reports.length === 0 ? (
        <AdminEmpty title={mn.admin.list.emptyReports} />
      ) : (
        <>
          <AdminTable
            caption={mn.admin.nav.reports}
            columns={[
              mn.admin.list.colCreated,
              mn.admin.list.colObject,
              mn.admin.list.colReason,
              mn.admin.list.colDetails,
              mn.admin.list.colStatus,
            ]}
            rows={reports.map((report) => ({
              id: report.id,
              cells: [
                <AdminMuted key="created">{formatDateTime(report.created_at)}</AdminMuted>,
                `${ENTITY_LABELS[report.entity_type] ?? report.entity_type} · ${report.entity_id.slice(0, 8)}`,
                report.reason,
                <span key="details" className="block max-w-[320px] truncate" title={report.details}>
                  {report.details || '—'}
                </span>,
                <AdminStatusPill
                  key="status"
                  label={REPORT_LABELS[report.status] ?? report.status}
                  tone={REPORT_TONES[report.status] ?? 'neutral'}
                />,
              ],
            }))}
          />

          <p className="mt-3 text-[11.5px] text-a-muted">
            {mn.admin.list.rowCount(reports.length)} · {mn.admin.list.limitNote(LIMIT)}
          </p>
        </>
      )}
    </div>
  );
}
