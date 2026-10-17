import { requireAdmin } from '@/lib/admin/require-admin';
import { getAdminCounts, getRecentActivity } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';

/**
 * Admin panel shell.
 *
 * `requireAdmin()` gates every route in this group (session + admin flag +
 * aal2), and the database re-checks `public.is_admin()` on every query, so the
 * shell itself is only presentation. All links are host-relative via
 * `adminHref()` (middleware rewrites `/x` -> `/admin/x`).
 *
 * The three data lookups below are cheap aggregates; they feed the sidebar
 * count pills, the right activity panel and the MFA state indicator.
 */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const [counts, activity] = await Promise.all([getAdminCounts(), getRecentActivity(8)]);

  // Initial for the avatar: first letter of the display name, else the email.
  const source = session.name.trim() || session.email || '?';
  const initial = source.slice(0, 1).toUpperCase();

  return (
    <AdminShell
      session={{
        name: session.name,
        email: session.email,
        initial,
        lastSignIn: null,
      }}
      counts={{ openReports: counts.openReports, newErrors: counts.newErrors }}
      mfaActive={session.aal === 'aal2'}
      activity={activity.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        createdAt: row.created_at,
      }))}
    >
      {children}
    </AdminShell>
  );
}
