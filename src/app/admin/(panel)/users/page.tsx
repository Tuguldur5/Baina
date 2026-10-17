import type { Metadata } from 'next';
import { mn } from '@/lib/i18n/mn';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getAdminProfiles, type AdminProfileFilter } from '@/lib/admin/queries';
import { AdminPageHeader, type HeaderTab } from '@/components/admin/AdminPageHeader';
import { AdminEmpty } from '@/components/admin/AdminNotBuilt';
import { AdminMuted, AdminStatusPill, AdminTable } from '@/components/admin/AdminTable';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: mn.admin.nav.usersAll };

/** Page cap. The header states it, so the list never pretends to be complete. */
const LIMIT = 50;

const FILTERS: Array<{ key: AdminProfileFilter; label: string; href: string }> = [
  { key: 'all', label: mn.admin.list.filterAll, href: '/users' },
  { key: 'user', label: mn.admin.list.filterUsers, href: '/users?filter=user' },
  { key: 'company', label: mn.admin.list.filterCompanies, href: '/users?filter=company' },
  { key: 'admin', label: mn.admin.list.filterAdmins, href: '/users?filter=admin' },
];

function parseFilter(value: string | undefined): AdminProfileFilter {
  return value === 'user' || value === 'company' || value === 'admin' ? value : 'all';
}

/**
 * User list (admin host `/users`).
 *
 * Reads the `admin_profiles_meta` view only: emails arrive MASKED and no phone
 * number column exists to select, so this page cannot leak either. Filtering is
 * a server-side `.eq()` (see `getAdminProfiles`) — the filter lives in the URL
 * so a filtered view is linkable and survives a reload.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  await requireAdmin();

  const filter = parseFilter(searchParams.filter);
  const profiles = await getAdminProfiles(LIMIT, filter);

  const tabs: HeaderTab[] = FILTERS.map((entry) => ({
    href: entry.href,
    label: entry.label,
    active: entry.key === filter,
  }));

  return (
    <div>
      <AdminPageHeader
        title={mn.admin.nav.usersAll}
        subtitle={mn.admin.list.subtitleUsers}
        breadcrumb={[mn.admin.nav.users, mn.admin.nav.usersAll]}
        tabs={tabs}
      />

      {profiles.length === 0 ? (
        <AdminEmpty title={mn.admin.list.emptyUsers} />
      ) : (
        <>
          <AdminTable
            caption={mn.admin.nav.usersAll}
            columns={[
              mn.admin.list.colName,
              mn.admin.list.colEmail,
              mn.admin.list.colRole,
              mn.admin.list.colStatus,
              mn.admin.list.colTenders,
              mn.admin.list.colProposals,
              mn.admin.list.colJoined,
            ]}
            rows={profiles.map((profile) => ({
              id: profile.id,
              cells: [
                <span key="name" className="flex items-center gap-2">
                  <span className="min-w-0 truncate font-medium">
                    {profile.name || mn.admin.sidebar.never}
                  </span>
                  {profile.is_admin && (
                    <AdminStatusPill label={mn.admin.badge} tone="info" />
                  )}
                </span>,
                <AdminMuted key="email">{profile.email_masked ?? '—'}</AdminMuted>,
                profile.role === 'company'
                  ? mn.roles.company
                  : profile.role === 'user'
                    ? mn.roles.user
                    : profile.role,
                <AdminStatusPill
                  key="status"
                  label={
                    profile.status === 'suspended'
                      ? mn.admin.list.profileStatusSuspended
                      : mn.admin.list.profileStatusActive
                  }
                  tone={profile.status === 'suspended' ? 'danger' : 'success'}
                />,
                profile.tenders_count,
                profile.proposals_count,
                <AdminMuted key="created">{formatDate(profile.created_at)}</AdminMuted>,
              ],
            }))}
          />

          <p className="mt-3 text-[11.5px] text-a-muted">
            {mn.admin.list.rowCount(profiles.length)} · {mn.admin.list.limitNote(LIMIT)} ·{' '}
            {mn.admin.list.maskNote}
          </p>
        </>
      )}
    </div>
  );
}
