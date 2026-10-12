import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { mn } from '@/lib/i18n/mn';

/**
 * Dark navy rounded-3xl footer card matching the header pill.
 * 1 column on mobile → 2 → 4 columns on large screens.
 */
export function Footer() {
  return (
    <footer className="px-3 pb-6 pt-10 sm:px-6">
      <div
        className="mx-auto max-w-7xl rounded-3xl bg-navy px-6 py-10 ring-1 ring-white/10 sm:px-10"
        style={{ boxShadow: '0 20px 50px -25px rgb(15 23 42 / 0.6)' }}
      >
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Logo vertical="tender" variant="dark" size={36} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              {mn.footer.description}
            </p>
          </div>

          {/* Платформ */}
          <nav aria-label={mn.footer.platform}>
            <h3 className="text-sm font-semibold text-white">
              {mn.footer.platform}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/tenders"
                  className="text-white/60 transition-colors hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {mn.footer.linkTenders}
                </Link>
              </li>
              <li>
                <Link
                  href="/#how"
                  className="text-white/60 transition-colors hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {mn.footer.linkHow}
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register"
                  className="text-white/60 transition-colors hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {mn.header.register}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Компани */}
          <nav aria-label={mn.footer.company}>
            <h3 className="text-sm font-semibold text-white">
              {mn.footer.company}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-white/60 transition-colors hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {mn.footer.linkAbout}
                </Link>
              </li>
              <li>
                <Link
                  href="/tenders?owner=company"
                  className="text-white/60 transition-colors hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {mn.footer.linkCompanyTenders}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-white/60 transition-colors hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {mn.dashboard.title}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Хууль + холбоо барих */}
          <div>
            <h3 className="text-sm font-semibold text-white">
              {mn.footer.legal}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-white/60 transition-colors hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {mn.footer.linkTerms}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-white/60 transition-colors hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {mn.footer.linkPrivacy}
                </Link>
              </li>
            </ul>

            <h3 className="mt-6 text-sm font-semibold text-white">
              {mn.footer.contact}
            </h3>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/60">
              <Mail className="h-4 w-4 text-primary-500" aria-hidden="true" />
              <a
                href={`mailto:${mn.footer.email}`}
                className="transition-colors hover:text-primary-500"
              >
                {mn.footer.email}
              </a>
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {mn.brand.name}. {mn.footer.rights}
          </p>
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-500" aria-hidden="true" />
            {mn.brand.tagline}
          </p>
        </div>
      </div>
    </footer>
  );
}
