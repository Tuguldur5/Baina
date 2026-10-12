import { SectionLoader } from '@/components/ui/Loading';

/** Loading state while the dashboard data is being fetched. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <SectionLoader />
    </div>
  );
}
