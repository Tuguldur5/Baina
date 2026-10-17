import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/layout/Container';
import { TenderCard } from '@/components/tenders/TenderCard';
import { TenderFilters } from '@/components/tenders/TenderFilters';
import { TenderListPagination } from '@/components/tenders/TenderListPagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StaggerGrid } from '@/components/ui/StaggerGrid';
import { getTenders } from '@/lib/supabase/queries';
import { tenderFiltersSchema } from '@/lib/validators/tender';
import { ITEMS_PER_PAGE } from '@/lib/constants';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.seo.tenders.title,
  description: mn.seo.tenders.description,
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function TenderList({ searchParams }: { searchParams: SearchParams }) {
  // Parse & validate URL params with Zod (invalid values fall back to defaults).
  const parsed = tenderFiltersSchema.safeParse({
    q: first(searchParams.q),
    category: first(searchParams.category),
    region: first(searchParams.region),
    status: first(searchParams.status),
    owner: first(searchParams.owner),
    min: first(searchParams.min),
    max: first(searchParams.max),
    sort: first(searchParams.sort),
    page: first(searchParams.page),
  });
  const filters = parsed.success ? parsed.data : { page: 1 };

  const page = filters.page ?? 1;
  const { tenders, total } = await getTenders({
    q: filters.q,
    category: filters.category,
    region: filters.region,
    status: filters.status,
    ownerType: filters.owner,
    min: filters.min,
    max: filters.max,
    sort: filters.sort,
    page,
    pageSize: ITEMS_PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-text">{mn.tenders.title}</h1>
        <p className="mt-2 text-muted">{mn.tenders.subtitle}</p>
      </div>

      <TenderFilters />

      <p className="mt-6 text-sm text-muted" role="status">
        {mn.tenders.resultsCount(total)}
      </p>

      <div className="mt-4">
        {tenders.length === 0 ? (
          <EmptyState
            title={mn.tenders.empty.title}
            text={mn.tenders.empty.text}
            action={{
              label: mn.tenders.empty.cta,
              href: '/tenders',
            }}
          />
        ) : (
          <StaggerGrid>
            {tenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </StaggerGrid>
        )}
      </div>

      <TenderListPagination page={page} totalPages={totalPages} />
    </>
  );
}

export default function TendersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Container className="py-10">
      <Suspense
        fallback={
          <div className="mt-10">
            <SkeletonList count={6} />
          </div>
        }
      >
        <TenderList searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
