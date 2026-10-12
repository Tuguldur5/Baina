import { SectionLoader } from '@/components/ui/Loading';

/** Route-level loading fallback (covers only the page content area). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <SectionLoader />
    </div>
  );
}
