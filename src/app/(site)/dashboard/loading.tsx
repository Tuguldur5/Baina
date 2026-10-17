import { SectionLoader } from '@/components/ui/Loading';
import { Container } from '@/components/layout/Container';

/** Loading state while the dashboard data is being fetched. */
export default function DashboardLoading() {
  return (
    <Container className="py-10">
      <SectionLoader />
    </Container>
  );
}
