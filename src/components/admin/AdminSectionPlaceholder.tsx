import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminNotBuilt } from '@/components/admin/AdminNotBuilt';

/**
 * Body shared by the admin sections that only exist in the navigation so far
 * (A4 completion): the route, its title, its breadcrumb and its access control
 * are real, the content is not built yet.
 *
 * Access control lives one level up in `src/app/admin/(panel)/layout.tsx`
 * (`requireAdmin()` — session + admin flag + aal2), and the database re-checks
 * `public.is_admin()` on every query, so these pages need no gate of their own.
 *
 * Each section is its own route file rather than one `[...slug]` catch-all:
 * an unknown admin path must stay a genuine 404, and a `notFound()` thrown
 * while a PAGE renders happens after the async panel layout has flushed the
 * shell — Next would answer 200. A route that does not exist is decided before
 * any rendering, so the status is correct.
 */
export function AdminSectionPlaceholder({
  title,
  subtitle,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  /** Trail above the title; the current page is appended automatically. */
  breadcrumb?: string[];
}) {
  const trail = breadcrumb ?? [];
  return (
    <div>
      <AdminPageHeader title={title} subtitle={subtitle} breadcrumb={[...trail, title]} />
      <AdminNotBuilt />
    </div>
  );
}
