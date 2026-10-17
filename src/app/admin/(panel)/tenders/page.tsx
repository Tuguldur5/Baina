import type { Metadata } from 'next';
import { mn } from '@/lib/i18n/mn';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getAdminTenders } from '@/lib/admin/queries';
import { getSiteUrl } from '@/lib/hosts';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminEmpty } from '@/components/admin/AdminNotBuilt';
import { AdminMuted, AdminStatusPill, AdminTable, type AdminPillTone } from '@/components/admin/AdminTable';
import { formatDate, formatMNT } from '@/lib/utils';

export const metadata: Metadata = { title: mn.admin.nav.tendersAll };

const LIMIT = 50;

const TENDER_TONES: Record<string, AdminPillTone> = {
  open: 'success',
  closed: 'neutral',
  awarded: 'info',
};

const TENDER_LABELS: Record<string, string> = {
  open: mn.tenderStatus.open,
  closed: mn.tenderStatus.closed,
  awarded: mn.tenderStatus.awarded,
};

/**
 * All tenders (admin host `/tenders`).
 *
 * Reads the `tenders` table through the admin RLS policy. It deliberately does
 * NOT touch `tender_private_details`: the list is metadata only, so the panel
 * never becomes a side door into confidential content (see SECURITY.md).
 * The title links to the PUBLIC page (other host, hence `getSiteUrl`) which is
 * where a moderator reads the tender in the same form a visitor does.
 */
export default async function AdminTendersPage() {
  await requireAdmin();

  const tenders = await getAdminTenders(LIMIT);

  return (
    <div>
      <AdminPageHeader
        title={mn.admin.nav.tendersAll}
        subtitle={mn.admin.list.subtitleTenders}
        breadcrumb={[mn.admin.nav.tenders, mn.admin.nav.tendersAll]}
      />

      {tenders.length === 0 ? (
        <AdminEmpty title={mn.admin.list.emptyTenders} />
      ) : (
        <>
          <AdminTable
            caption={mn.admin.nav.tendersAll}
            columns={[
              mn.admin.list.colTitle,
              mn.admin.list.colCategory,
              mn.admin.list.colRegion,
              mn.admin.list.colBudget,
              mn.admin.list.colDeadline,
              mn.admin.list.colStatus,
              mn.admin.list.colCreated,
            ]}
            rows={tenders.map((tender) => ({
              id: tender.id,
              cells: [
                <a
                  key="title"
                  href={getSiteUrl(`/tenders/${tender.id}`)}
                  className="font-medium text-a-info underline-offset-2 hover:underline"
                >
                  {tender.title}
                </a>,
                tender.category,
                tender.region ?? '—',
                formatMNT(tender.budget),
                <AdminMuted key="deadline">{formatDate(tender.deadline)}</AdminMuted>,
                <AdminStatusPill
                  key="status"
                  label={TENDER_LABELS[tender.status] ?? tender.status}
                  tone={TENDER_TONES[tender.status] ?? 'neutral'}
                />,
                <AdminMuted key="created">{formatDate(tender.created_at)}</AdminMuted>,
              ],
            }))}
          />

          <p className="mt-3 text-[11.5px] text-a-muted">
            {mn.admin.list.rowCount(tenders.length)} · {mn.admin.list.limitNote(LIMIT)}
          </p>
        </>
      )}
    </div>
  );
}
