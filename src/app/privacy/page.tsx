import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.seo.privacy.title,
  description: mn.seo.privacy.description,
};

/** "Нууцлалын бодлого" static page. */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-text">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 dark:bg-accent-950">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        {mn.static.privacy.title}
      </h1>
      <p className="mt-6 leading-8 text-muted">{mn.static.privacy.body}</p>

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
  );
}
