import { mn } from '@/lib/i18n/mn';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';
import {
  getHeaderUser,
  getNotifications,
  getUnreadNotificationCount,
} from '@/lib/supabase/queries';

/**
 * Public site chrome. Everything in the `(site)` route group shares this layout
 * (header, footer, help assistant, skip link) — it is rendered identically on
 * every public page, and never on the admin host.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerUser = await getHeaderUser();
  const [unread, notifications] = headerUser
    ? await Promise.all([
        getUnreadNotificationCount(headerUser.id),
        // The bell popover shows exactly the latest 5.
        getNotifications(headerUser.id, 5),
      ])
    : [0, []];

  return (
    <>
      {/* Fixed backdrop for EVERY public page: warm-orange + slate blobs and a
          faint dot grid for the glass header to blur. Never on the admin host
          (this layout only renders on the public routes). */}
      <div className="site-backdrop" aria-hidden="true" />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-navy"
      >
        {mn.common.skipToContent}
      </a>
      <Header user={headerUser} unread={unread} notifications={notifications} />
      <main id="main-content" className="flex-1 pt-[84px] sm:pt-[92px]">
        {children}
      </main>
      <Footer />
      {/* Help assistant: floats in the bottom-right corner of every public page. */}
      <AssistantWidget />
    </>
  );
}
