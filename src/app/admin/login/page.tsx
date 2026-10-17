import type { Metadata } from 'next';
import { mn } from '@/lib/i18n/mn';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

export const metadata: Metadata = {
  title: mn.admin.login.title,
  robots: { index: false, follow: false },
};

/**
 * Admin sign-in page. On the admin host this file is served at `/login`
 * (middleware rewrites `/login` -> `/admin/login`); on the public host any
 * `/admin/*` path is a 404, so this page is unreachable from baina.mn.
 */
export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <AdminLoginForm />
    </main>
  );
}
