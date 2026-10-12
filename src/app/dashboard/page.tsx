import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AnalyticsOverview } from '@/components/dashboard/AnalyticsOverview';
import { DashboardTabs } from '@/components/dashboard/DashboardTabs';
import { MyTendersTab } from '@/components/dashboard/MyTendersTab';
import { MyProposalsTab } from '@/components/dashboard/MyProposalsTab';
import { NotificationsTab } from '@/components/dashboard/NotificationsTab';
import { ProfileTab } from '@/components/dashboard/ProfileTab';
import {
  getCurrentProfile,
  getDashboardAnalytics,
  getMyProposals,
  getMyTenders,
  getNotifications,
} from '@/lib/supabase/queries';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.seo.dashboard.title,
  description: mn.seo.dashboard.description,
};

const TAB_IDS = ['tenders', 'proposals', 'notifications', 'profile'] as const;
type TabId = (typeof TAB_IDS)[number];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const profile = await getCurrentProfile();
  // Middleware already protects this route; double-check server-side.
  if (!profile) {
    redirect('/auth/login');
  }

  const activeTab: TabId = (TAB_IDS as readonly string[]).includes(
    searchParams.tab ?? ''
  )
    ? (searchParams.tab as TabId)
    : 'tenders';

  const [tenders, proposals, notifications, analytics] = await Promise.all([
    getMyTenders(profile.id),
    getMyProposals(profile.id),
    getNotifications(profile.id, 50),
    getDashboardAnalytics(profile.id),
  ]);

  const unread = notifications.filter((item) => !item.read).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-text">
          {mn.dashboard.title}
        </h1>
        <p className="mt-1 text-muted">
          {profile.companyName ?? profile.name} · {mn.roles[profile.role]}
        </p>
        <p className="mt-2 text-sm text-muted">{mn.dashboard.subtitle}</p>
      </div>

      <AnalyticsOverview data={analytics} />

      <div className="mt-10">
        <DashboardTabs
          active={activeTab}
          counts={{
            tenders: tenders.length,
            proposals: proposals.length,
            notifications: unread,
          }}
        />
      </div>

      <div className="mt-8">
        {activeTab === 'tenders' && <MyTendersTab tenders={tenders} />}
        {activeTab === 'proposals' && <MyProposalsTab proposals={proposals} />}
        {activeTab === 'notifications' && (
          <NotificationsTab notifications={notifications} />
        )}
        {activeTab === 'profile' && <ProfileTab profile={profile} />}
      </div>
    </div>
  );
}
