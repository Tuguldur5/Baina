'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Pagination } from '@/components/ui/Pagination';

/** Pagination bound to the `page` URL search param. */
export function TenderListPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goTo = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete('page');
    else params.set('page', String(nextPage));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    // Scroll back to the top of the list for a predictable UX.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <Pagination page={page} totalPages={totalPages} onPageChange={goTo} />;
}
