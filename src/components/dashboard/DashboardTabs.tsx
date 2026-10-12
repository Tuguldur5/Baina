'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs } from '@/components/ui/Tabs';
import { mn } from '@/lib/i18n/mn';

const TAB_IDS = ['tenders', 'proposals', 'notifications', 'profile'] as const;
type TabId = (typeof TAB_IDS)[number];

/** Dashboard tabs bound to the `tab` URL search param. */
export function DashboardTabs({
  active,
  counts,
}: {
  active: string;
  counts: {
    tenders?: number;
    proposals?: number;
    notifications?: number;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const safeActive = (TAB_IDS as readonly string[]).includes(active)
    ? active
    : 'tenders';

  const onChange = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs
      active={safeActive}
      onChange={onChange}
      items={[
        {
          id: 'tenders',
          label: mn.dashboard.tabs.myTenders,
          count: counts.tenders,
        },
        {
          id: 'proposals',
          label: mn.dashboard.tabs.myProposals,
          count: counts.proposals,
        },
        {
          id: 'notifications',
          label: mn.dashboard.tabs.notifications,
          count: counts.notifications,
        },
        { id: 'profile', label: mn.dashboard.tabs.profile },
      ]}
    />
  );
}
