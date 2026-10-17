import type { Metadata } from 'next';
import { mn } from '@/lib/i18n/mn';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getAdminProfiles } from '@/lib/admin/queries';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminEmpty } from '@/components/admin/AdminNotBuilt';
import { AdminMuted, AdminStatusPill, AdminTable } from '@/components/admin/AdminTable';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: mn.admin.nav.companies };

const LIMIT = 50;

/**
 * Companies (admin host `/companies`).
 *
 * Same view as `/users`, filtered to `role = 'company'` in the query. The
 * company NAME comes from the profile row (`company_name`), not from a join to
 * the tenders table, so the list is complete even for a company that has never
 * posted a tender.
 */
export default async function AdminCompaniesPage() {
  await requireAdmin();

  const companies = await getAdminProfiles(LIMIT, 'company');

  return (
    <div>
      <AdminPageHeader
        title={mn.admin.nav.companies}
        subtitle={mn.admin.list.subtitleCompanies}
        breadcrumb={[mn.admin.nav.users, mn.admin.nav.companies]}
      />

      {companies.length === 0 ? (
        <AdminEmpty title={mn.admin.list.emptyUsers} />
      ) : (
        <>
          <AdminTable
            caption={mn.admin.nav.companies}
            columns={[
              mn.admin.list.colCompany,
              mn.admin.list.colName,
              mn.admin.list.colEmail,
              mn.admin.list.colTenders,
              mn.admin.list.colProposals,
              mn.admin.list.colStatus,
              mn.admin.list.colJoined,
            ]}
            rows={companies.map((company) => ({
              id: company.id,
              cells: [
                <span key="company" className="font-medium">
                  {company.company_name ?? mn.admin.sidebar.never}
                </span>,
                company.name || mn.admin.sidebar.never,
                <AdminMuted key="email">{company.email_masked ?? '—'}</AdminMuted>,
                company.tenders_count,
                company.proposals_count,
                <AdminStatusPill
                  key="status"
                  label={
                    company.status === 'suspended'
                      ? mn.admin.list.profileStatusSuspended
                      : mn.admin.list.profileStatusActive
                  }
                  tone={company.status === 'suspended' ? 'danger' : 'success'}
                />,
                <AdminMuted key="created">{formatDate(company.created_at)}</AdminMuted>,
              ],
            }))}
          />

          <p className="mt-3 text-[11.5px] text-a-muted">
            {mn.admin.list.rowCount(companies.length)} · {mn.admin.list.limitNote(LIMIT)} ·{' '}
            {mn.admin.list.maskNote}
          </p>
        </>
      )}
    </div>
  );
}
