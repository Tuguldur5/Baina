import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ArrowRight, Lock, LockOpen, ShieldAlert, Users } from 'lucide-react';
import { mn } from '@/lib/i18n/mn';

export const metadata: Metadata = {
  title: mn.seo.about.title,
  description: mn.seo.about.description,
};

/** "Бидний тухай" static page (two-tier information model + both roles). */
export default function AboutPage() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-text">
        {mn.static.about.title}
      </h1>
      <p className="mt-6 text-lg leading-8 text-muted">
        {mn.static.about.lead}
      </p>
      <p className="mt-4 leading-8 text-muted">{mn.static.about.body}</p>

      {/* Admin access statement — enforced by RLS (db/admin.sql), not by the UI. */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-info-200 bg-info-50 p-4 dark:border-info-900 dark:bg-info-950">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info-100 text-info-700 dark:bg-info-900 dark:text-info-300">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm leading-6 text-text">{mn.static.adminNotice}</p>
      </div>

      {/* quick visual: both roles + two tiers */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card flex items-start gap-3 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 dark:bg-accent-950">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-text">
              {mn.roles.user} · {mn.roles.company}
            </p>
            <p className="mt-1 text-sm text-muted">
              {mn.landing.compare.subtitle}
            </p>
          </div>
        </div>
        <div className="card flex items-start gap-3 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-info-50 text-info-700 dark:bg-info-950">
            <LockOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-text">
              {mn.landing.how.twoTier.title}
            </p>
            <p className="mt-1 text-sm text-muted">
              {mn.landing.how.twoTier.publicLabel} → {mn.landing.how.twoTier.privateLabel}
            </p>
          </div>
        </div>
      </div>

      {mn.static.about.sections.map((section, index) => (
        <section key={section.title} className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold text-text">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-navy">
              {index + 1}
            </span>
            {section.title}
          </h2>
          <p className="mt-3 leading-8 text-muted">{section.text}</p>
        </section>
      ))}

      {/* How it works — the deep-link target of the header's
          "Хэрхэн ажилладаг" (/about#how). */}
      <section id="how" className="mt-10 scroll-mt-28">
        <h2 className="flex items-center gap-2 text-xl font-bold text-text">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-navy">
            {mn.static.about.sections.length + 1}
          </span>
          {mn.landing.how.title}
        </h2>
        <p className="mt-3 leading-8 text-muted">{mn.landing.how.subtitle}</p>
        <ol className="mt-4 space-y-3">
          {mn.landing.how.steps.map((step) => (
            <li key={step.number} className="card flex items-start gap-3 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-xs font-bold text-accent-700 dark:bg-accent-950 dark:text-accent-300">
                {step.number}
              </span>
              <span>
                <span className="block text-sm font-bold text-text">{step.title}</span>
                <span className="mt-1 block text-sm text-muted">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 flex flex-col items-start gap-3 rounded-3xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Lock className="h-4 w-4 text-warning-600" aria-hidden="true" />
          {mn.tenderDetail.lockedText}
        </p>
        <Link
          href="/tenders"
          className="inline-flex min-h-tap items-center gap-2 rounded-full bg-primary-500 px-6 text-sm font-semibold text-navy transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {mn.hero.ctaSecondary}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      </div>
    </Container>
  );
}
