import { Hero } from '@/components/landing/Hero';
import { StatsStrip } from '@/components/landing/StatsStrip';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeaturedTenders } from '@/components/landing/FeaturedTenders';
import { CategoriesGrid } from '@/components/landing/CategoriesGrid';
import { Comparison } from '@/components/landing/Comparison';
import { CtaBand } from '@/components/landing/CtaBand';
import {
  getFeaturedTenders,
  getHeaderUser,
  getPublicStats,
} from '@/lib/supabase/queries';

export default async function HomePage() {
  const [featured, headerUser, stats] = await Promise.all([
    getFeaturedTenders(6),
    getHeaderUser(),
    getPublicStats(),
  ]);

  return (
    <>
      <Hero user={headerUser} />
      <StatsStrip
        openBudget={stats.openBudget}
        openTenders={stats.openTenders}
        companies={stats.companies}
      />
      <HowItWorks />
      <FeaturedTenders tenders={featured} />
      <CategoriesGrid />
      <Comparison />
      <CtaBand />
    </>
  );
}
