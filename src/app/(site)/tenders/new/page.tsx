import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TenderForm } from '@/components/tenders/TenderForm';
import { getCurrentProfile } from '@/lib/supabase/queries';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.createTender.title,
  description: mn.createTender.subtitle,
  robots: { index: false, follow: false },
};

/**
 * Full-page create-tender form (the mobile fallback for the header CTA).
 * Logged-out visitors are sent to the login page with a `next` redirect.
 */
export default async function NewTenderPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/auth/login?next=/tenders/new');
  }

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-3xl">
      <Link
        href="/tenders"
        className="inline-flex min-h-tap items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {mn.tenderDetail.backToList}
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
          {mn.createTender.title}
        </h1>
        <p className="mt-2 text-muted">{mn.createTender.subtitle}</p>
      </div>

      <div className="card mt-6 p-5 sm:p-7">
        <TenderForm />
      </div>
      </div>
    </Container>
  );
}
