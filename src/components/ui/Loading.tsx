import { Spinner } from '@/components/ui/Spinner';
import { SkeletonList } from '@/components/ui/Skeleton';
import { mn } from '@/lib/i18n/mn';

/**
 * Loading helpers. Rules: only cover the section being fetched —
 * never hide the whole page behind a loader.
 */

/** Inline section loader with spinner + label. */
export function SectionLoader({ label }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-16 text-muted"
    >
      <Spinner size="md" />
      <p className="text-sm">{label ?? mn.common.loading}</p>
    </div>
  );
}

/** Grid skeleton for tender lists (use inside the list section only). */
export function TenderGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{mn.common.loading}</span>
      <SkeletonList count={count} />
    </div>
  );
}

export { Spinner, SkeletonList };
export { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
