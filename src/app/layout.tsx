import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { mn } from '@/lib/i18n/mn';
import { SITE_URL } from '@/lib/constants';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';
import { getHeaderUser, getNotifications, getUnreadNotificationCount } from '@/lib/supabase/queries';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: mn.seo.home.title,
    template: `%s | ${mn.brand.name}`,
  },
  description: mn.seo.home.description,
  keywords: ['тендер', 'тендерийн платформ', 'санал', 'Монгол', 'ажил', 'компани'],
  openGraph: {
    type: 'website',
    locale: 'mn_MN',
    url: SITE_URL,
    siteName: mn.brand.name,
    title: mn.seo.home.title,
    description: mn.seo.home.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: mn.seo.home.title,
    description: mn.seo.home.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headerUser = await getHeaderUser();
  const [unread, notifications] = headerUser
    ? await Promise.all([
        getUnreadNotificationCount(headerUser.id),
        getNotifications(headerUser.id, 6),
      ])
    : [0, []];

  return (
    <html lang="mn" className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-bg font-sans text-text">
        <ThemeProvider>
          <ToastProvider>
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
            {/* Help assistant: floats in the bottom-right corner of every page. */}
            <AssistantWidget />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
