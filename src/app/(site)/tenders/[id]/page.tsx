import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, MapPin, Tag } from 'lucide-react';
import { TenderStatusBadge, RoleBadge, Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ConfidentialPanel } from '@/components/tenders/ConfidentialPanel';
import { TenderDetailSections } from '@/components/tenders/TenderDetailSections';
import { getTenderDetail, getCurrentProfile } from '@/lib/supabase/queries';
import { formatDate } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';

type Params = { params: { id: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const profile = await getCurrentProfile();
  const { tender } = await getTenderDetail(params.id, profile?.id ?? null);
  if (!tender) {
    return { title: mn.errors.notFoundTitle };
  }
  return {
    title: tender.title,
    description: tender.description.slice(0, 160),
    openGraph: {
      title: tender.title,
      description: tender.description.slice(0, 160),
    },
  };
}

export default async function TenderDetailPage({ params }: Params) {
  const profile = await getCurrentProfile();
  const {
    tender,
    proposals,
    isOwner,
    viewerProposal,
    privateDetails,
    proposalsCount,
  } = await getTenderDetail(params.id, profile?.id ?? null);

  if (!tender) {
    notFound();
  }

  const isExpired = new Date(tender.deadline).getTime() <= Date.now();
  const isClosed = tender.status !== 'open' || isExpired;

  return (
    <Container className="py-10">
      <Link
        href="/tenders"
        className="inline-flex min-h-tap items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {mn.tenderDetail.backToList}
      </Link>

      <article className="mt-4">
        <TenderDetailSections
          tender={tender}
          proposals={proposals}
          viewerProposal={viewerProposal}
          isOwner={isOwner}
          isLoggedIn={profile !== null}
          isClosed={isClosed}
          isExpired={isExpired}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{tender.category}</Badge>
            {tender.region && (
              <Badge tone="info">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {tender.region}
              </Badge>
            )}
            <TenderStatusBadge status={tender.status} />
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-text">
            {tender.title}
          </h1>

          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {mn.tenders.labels.createdAt}: {formatDate(tender.createdAt)}
            <span aria-hidden="true">•</span>
            <Tag className="h-4 w-4" aria-hidden="true" />
            {mn.tenders.labels.proposals}: {proposalsCount}
          </p>

          {/* Public (stage-1) description */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-text">
              {mn.tenders.labels.description}
            </h2>
            <div className="card mt-3 p-6">
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted">
                {tender.description}
              </p>
            </div>
          </section>

          {/* Two-tier confidential information */}
          <div className="mt-8">
            <ConfidentialPanel details={privateDetails} canEdit={isOwner} />
          </div>

          {/* Owner (masked for anonymous viewers, real when RLS allows it) */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-text">
              {mn.tenders.labels.owner}
            </h2>
            <div className="card mt-3 flex items-center gap-4 p-6">
              <Avatar
                src={tender.owner?.avatarUrl ?? null}
                name={tender.owner?.companyName ?? tender.owner?.name ?? '?'}
                size="lg"
              />
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-text">
                  {tender.owner?.companyName ?? tender.owner?.name ?? '—'}
                </p>
                {tender.owner && (
                  <div className="mt-1">
                    <RoleBadge role={tender.owner.role} />
                  </div>
                )}
                <p className="mt-1 text-xs text-muted">
                  {mn.tenders.labels.createdAt}: {formatDate(tender.createdAt)}
                </p>
              </div>
            </div>
          </section>
        </TenderDetailSections>
      </article>
    </Container>
  );
}
