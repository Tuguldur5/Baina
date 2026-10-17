'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LayoutGrid, Search, Sparkles } from 'lucide-react';
import { CreateTenderModal } from '@/components/tenders/CreateTenderModal';
import { Container } from '@/components/layout/Container';
import { mn } from '@/lib/i18n/mn';
import type { TenderOwner } from '@/lib/types/index';

/**
 * Hero: eyebrow → headline → subtitle → BIG centered search bar → chips →
 * CTAs. The entrance animation is pure CSS (.enter-N) so the content is
 * visible even if JavaScript never hydrates.
 */
export function Hero({ user }: { user: TenderOwner | null }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const goToTenders = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    const qs = params.toString();
    router.push(qs ? `/tenders?${qs}` : '/tenders');
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    goToTenders();
  };

  const onPostTender = () => {
    if (!user) {
      router.push('/auth/login?next=/tenders/new');
      return;
    }
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      router.push('/tenders/new');
      return;
    }
    setCreateOpen(true);
  };

  return (
    <section
      /*
       * The hero deliberately starts at the very top of the page and takes over
       * the layout's 84/92px header offset itself (`-mt` + `pt`), so its backdrop
       * runs BEHIND the floating header instead of beginning below it. That seam
       * — a flat page strip above the aurora — was the only thing separating the
       * header from the hero; now the header pill sits on the hero surface
       * (it turns translucent on the home page, see components/layout/Header).
       */
      className="relative -mt-[84px] overflow-hidden pt-[84px] sm:-mt-[92px] sm:pt-[92px]"
    >
      {/* Hero backdrop, three layers so the surface reads as designed rather
          than tinted:
            1. a hairline grid that only shows where the aurora is strongest,
            2. one centered amber aurora behind the headline/search (amber) with
               teal and violet pools at the shoulders,
            3. a fade into the page background so nothing ends in a hard edge.
          Every token is redefined under .dark. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] hero-grid"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-hero"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-bg"
      />

      <Container className="relative pb-14 pt-8 text-center sm:pt-12">
        {/* Eyebrow */}
        <p className="enter-1 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-text">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" aria-hidden="true" />
          {mn.hero.eyebrow}
        </p>

        {/* Headline */}
        <h1 className="enter-2 mx-auto mt-4 max-w-4xl text-4xl font-extrabold leading-[1.06] tracking-tight text-text sm:text-5xl lg:text-6xl">
          {mn.hero.title}
        </h1>

        <p className="enter-3 mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {mn.hero.subtitle}
        </p>

        {/* Big centered search bar */}
        <form
          role="search"
          onSubmit={onSearch}
          className="enter-4 mx-auto mt-8 w-full max-w-3xl"
        >
          <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 p-2 shadow-card backdrop-blur-xl focus-within:ring-2 focus-within:ring-primary-500 dark:border-white/10 dark:bg-white/5">
            <label htmlFor="hero-search" className="sr-only">
              {mn.header.searchLabel}
            </label>
            <span className="ml-3 shrink-0 text-primary-500" aria-hidden="true">
              <Search className="h-5 w-5" />
            </span>
            <input
              id="hero-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mn.hero.searchPlaceholder}
              className="h-12 min-w-0 flex-1 bg-transparent px-1 text-base text-text placeholder:text-muted focus-visible:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary-500 px-5 text-sm font-bold text-navy transition-colors hover:bg-primary-600 active:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:px-7 sm:text-base"
            >
              {mn.hero.searchCta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>

        {/* CTAs */}
        <div className="enter-5 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onPostTender}
            className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-full bg-primary-500 px-7 text-base font-semibold text-navy shadow-card transition-colors hover:bg-primary-600 active:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:w-auto"
          >
            {mn.hero.ctaPrimary}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <Link
            href="/tenders"
            className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-full border border-white/70 bg-white/60 px-7 text-base font-semibold text-text backdrop-blur-md transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            {mn.hero.ctaSecondary}
          </Link>
        </div>

        <p className="enter-5 mt-6 flex flex-wrap items-center justify-center gap-1.5 text-sm">
          <span className="flex items-center gap-1.5 text-muted">
            <Sparkles className="h-3.5 w-3.5 text-primary-500" aria-hidden="true" />
            {mn.hero.linkRow}
          </span>
          <Link
            href="/tenders?owner=company"
            className="font-semibold text-info-600 underline-offset-4 transition-colors hover:text-info-700 hover:underline"
          >
            {mn.hero.companyLink} →
          </Link>
        </p>
      </Container>

      <CreateTenderModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </section>
  );
}
