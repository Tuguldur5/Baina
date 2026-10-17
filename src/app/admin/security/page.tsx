import type { Metadata } from 'next';
import { mn } from '@/lib/i18n/mn';
import { requireAdminAal1 } from '@/lib/admin/require-admin';
import { AdminMfaPanel } from '@/components/admin/AdminMfaPanel';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';

export const metadata: Metadata = {
  title: mn.admin.security.title,
  robots: { index: false, follow: false },
};

/**
 * MFA enrollment / verification. Reachable at aal1 (the login form and
 * `requireAdmin()` both send admins here), which is why it uses
 * `requireAdminAal1()` instead of the aal2 gate.
 */
export default async function AdminSecurityPage() {
  const session = await requireAdminAal1();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{mn.admin.security.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{mn.admin.security.subtitle}</p>
          {session.email && (
            <p className="mt-1 text-xs text-slate-400">{session.email}</p>
          )}
        </div>
        <AdminLogoutButton
          label={mn.admin.login.logout}
          className="inline-flex min-h-tap items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
        />
      </div>
      <AdminMfaPanel />
    </main>
  );
}
