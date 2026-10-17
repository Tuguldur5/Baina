import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.tenders.title,
  // A redirect is not an indexable destination.
  robots: { index: false, follow: true },
};

/**
 * The public company directory ("Компанийн сан") was REMOVED — it never had a
 * real function (it could not show profiles anyway: they are not world
 * readable). The header, the command palette and the sitemap no longer link
 * here; this route only survives so a bookmarked or shared /companies URL
 * still lands somewhere sensible instead of a 404.
 *
 * The owner-type filter that replaced it is a first-class filter on /tenders.
 */
export default function CompaniesPage() {
  redirect('/tenders?owner=company');
}
