import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { mn } from '@/lib/i18n/mn';
import { SITE_URL } from '@/lib/constants';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
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

/**
 * Root layout — deliberately minimal: `<html>`, `<body>` and the app-wide
 * providers only. One deployment serves two hosts, so the chrome cannot live
 * here:
 *
 *   - the public site chrome (Header, Footer, help assistant) lives in the
 *     `(site)` route group layout — src/app/(site)/layout.tsx
 *   - the admin panel shell lives in src/app/admin/(panel)/layout.tsx
 *
 * URLs are unaffected by the route group.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn" className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-bg font-sans text-text">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
