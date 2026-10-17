import type { Metadata } from 'next';
import { mn } from '@/lib/i18n/mn';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getAuditLog } from '@/lib/admin/queries';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminEmpty } from '@/components/admin/AdminNotBuilt';
import { AdminMuted, AdminTable } from '@/components/admin/AdminTable';
import { formatDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: mn.admin.nav.auditLog };

const LIMIT = 50;

/**
 * Audit log (admin host `/audit-log`).
 *
 * The table is append-only (a trigger rejects UPDATE/DELETE, so even an admin
 * cannot rewrite history) and admin-readable via RLS. `action` and
 * `entity_type` are machine codes written by `write_audit()`; the page shows
 * them verbatim — translating them would risk a wrong label for a security
 * record.
 */
export default async function AdminAuditLogPage() {
  await requireAdmin();

  const entries = await getAuditLog(LIMIT);

  return (
    <div>
      <AdminPageHeader
        title={mn.admin.nav.auditLog}
        subtitle={mn.admin.list.subtitleAudit}
        breadcrumb={[mn.admin.nav.moderation, mn.admin.nav.auditLog]}
      />

      {entries.length === 0 ? (
        <AdminEmpty title={mn.admin.list.emptyAudit} />
      ) : (
        <>
          <AdminTable
            caption={mn.admin.nav.auditLog}
            columns={[
              mn.admin.list.colCreated,
              mn.admin.list.colActor,
              mn.admin.list.colAction,
              mn.admin.list.colObject,
            ]}
            rows={entries.map((entry) => ({
              id: entry.id,
              cells: [
                <AdminMuted key="created">{formatDateTime(entry.created_at)}</AdminMuted>,
                <AdminMuted key="actor">
                  {entry.admin_id ? entry.admin_id.slice(0, 8) : mn.admin.sidebar.never}
                </AdminMuted>,
                <code key="action" className="rounded bg-a-faint px-1.5 py-0.5 text-[11.5px]">
                  {entry.action}
                </code>,
                entry.entity_type
                  ? `${entry.entity_type}${entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ''}`
                  : '—',
              ],
            }))}
          />

          <p className="mt-3 text-[11.5px] text-a-muted">
            {mn.admin.list.rowCount(entries.length)} · {mn.admin.list.limitNote(LIMIT)} ·{' '}
            {mn.admin.list.auditCodesNote}
          </p>
        </>
      )}
    </div>
  );
}
