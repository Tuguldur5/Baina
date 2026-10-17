import type { Metadata } from 'next';
import { mn } from '@/lib/i18n/mn';

/**
 * Admin host root layout (admin.baina.mn, or admin.localhost:3000 in dev).
 *
 * Deliberately minimal: the public chrome must never render here, and the
 * login/security pages must render without the panel shell. The shell itself
 * (icon rail + sidebar + top bar, S3) lives in src/app/admin/(panel)/layout.tsx.
 *
 * Every admin response additionally carries `X-Robots-Tag: noindex, nofollow`
 * (set in src/middleware.ts) and this metadata is the belt-and-braces version.
 */
export const metadata: Metadata = {
  title: { default: mn.admin.title, template: `%s | ${mn.admin.title}` },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-slate-50 text-slate-900">{children}</div>;
}
