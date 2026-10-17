import type { Metadata } from 'next';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.seo.privacy.title,
  description: mn.seo.privacy.description,
};

/** "Нууцлалын бодлого" static page. */
export default function PrivacyPage() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-text">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 dark:bg-accent-950">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        {mn.static.privacy.title}
      </h1>
      <p className="mt-6 leading-8 text-muted">{mn.static.privacy.body}</p>

      {/* Admin access statement — enforced by RLS (db/admin.sql), not by the UI. */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-info-200 bg-info-50 p-4 dark:border-info-900 dark:bg-info-950">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info-100 text-info-700 dark:bg-info-900 dark:text-info-300">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm leading-6 text-text">{mn.static.adminNotice}</p>
      </div>

      {mn.static.privacy.sections.map((section) => (
        <section key={section.title} className="mt-8">
          <h2 className="text-lg font-bold text-text">{section.title}</h2>
          <p className="mt-2 leading-8 text-muted">{section.text}</p>
        </section>
      ))}

      <p className="mt-10 text-sm text-muted">
        {mn.footer.contact}: {mn.footer.email}
      </p>
      </div>
    </Container>
  );
}
