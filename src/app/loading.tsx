import { SectionLoader } from '@/components/ui/Loading';
import { Container } from '@/components/layout/Container';

/** Route-level loading fallback (covers only the page content area). */
export default function Loading() {
  return (
    <Container>
      <SectionLoader />
    </Container>
  );
}
