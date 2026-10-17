'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowUp, Plus, Search } from 'lucide-react';
import { ADMIN_LEAVES, ADMIN_QUICK } from '@/lib/admin/nav';
import { adminHref } from '@/lib/hosts';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';

/**
 * Overview command composer (spec A5) — Freebuff's chat composer, repurposed as
 * a search/jump field.
 *
 * Bottom row: two dropdown chips on the left, a "+" action menu and a round
 * orange send button on the right. Typing filters admin pages instantly and
 * additionally looks up real tenders (by title) and real users (by name) using
 * only admin-visible columns. `/` reveals the full page/action list.
 *
 * The "Хамрах хүрээ" chip scopes those live lookups; "Хугацаа" is a display
 * range for the analytics below and is intentionally not wired to a query that
 * would need a column the admin surface does not expose.
 */

type Hit = { key: string; label: string; hint: string; href: string };

const RANGES = [
  { key: '30', label: mn.admin.overview.range30 },
  { key: '90', label: mn.admin.overview.range90 },
  { key: '365', label: mn.admin.overview.range365 },
] as const;

const SCOPES = [
  { key: 'all', label: mn.admin.overview.scopeAll },
  { key: 'tenders', label: mn.admin.overview.scopeTenders },
  { key: 'users', label: mn.admin.overview.scopeUsers },
  { key: 'reports', label: mn.admin.overview.scopeReports },
] as const;

export function AdminOverviewComposer() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('30');
  const [scope, setScope] = useState<(typeof SCOPES)[number]['key']>('all');
  const [openMenu, setOpenMenu] = useState<'range' | 'scope' | 'add' | null>(null);
  const [remote, setRemote] = useState<Hit[]>([]);

  const pages = useMemo<Hit[]>(
    () =>
      [...ADMIN_QUICK, ...ADMIN_LEAVES].map((leaf) => ({
        key: `page:${leaf.href}`,
        label: leaf.label,
        hint: leaf.href,
        href: leaf.href,
      })),
    []
  );

  const showAll = query.trim() === '/';

  const pageHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || showAll) return showAll ? pages : [];
    return pages.filter(
      (page) => page.label.toLowerCase().includes(q) || page.hint.toLowerCase().includes(q)
    );
  }, [pages, query, showAll]);

  const hits = useMemo(() => [...pageHits, ...remote], [pageHits, remote]);
  const visible = query.trim().length > 0 && (showAll || hits.length > 0);

  // Outside click closes the dropdowns.
  useEffect(() => {
    if (!openMenu) return;
    function onDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpenMenu(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openMenu]);

  // Live lookup: real tenders + real users, admin-visible columns only.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || showAll) {
      setRemote([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      const like = `%${q}%`;
      const wantTenders = scope === 'all' || scope === 'tenders';
      const wantUsers = scope === 'all' || scope === 'users';

      const [tenders, users] = await Promise.all([
        wantTenders
          ? supabase.from('tenders').select('id, title').ilike('title', like).limit(4)
          : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
        wantUsers
          ? supabase.from('admin_profiles_meta').select('id, name').ilike('name', like).limit(4)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      ]);

      if (cancelled) return;
      const next: Hit[] = [];
      for (const row of (tenders.data ?? []) as Array<{ id: string; title: string }>) {
        next.push({
          key: `tender:${row.id}`,
          label: row.title,
          hint: mn.admin.overview.composerTenders,
          href: `/tenders?q=${encodeURIComponent(row.title)}`,
        });
      }
      for (const row of (users.data ?? []) as Array<{ id: string; name: string }>) {
        next.push({
          key: `user:${row.id}`,
          label: row.name,
          hint: mn.admin.overview.composerUsers,
          href: `/users?q=${encodeURIComponent(row.name)}`,
        });
      }
      setRemote(next);
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, scope, showAll]);

  function go(href: string) {
    setQuery('');
    router.push(adminHref(href));
  }

  return (
    <div ref={wrapRef} className="relative mx-auto mb-6 max-w-3xl">
      <div className="rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] shadow-a-card">
        <div className="flex items-center gap-2 px-4 pt-3.5">
          <Search className="h-4 w-4 shrink-0 text-a-muted" strokeWidth={1.75} aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                const first = hits[0];
                if (first) go(first.href);
              }
              if (event.key === 'Escape') setQuery('');
            }}
            placeholder={mn.admin.overview.composerPlaceholder}
            aria-label={mn.admin.overview.composerPlaceholder}
            className="min-w-0 flex-1 bg-transparent py-2 text-[13px] text-a-ink placeholder:text-a-muted focus:outline-none"
          />
        </div>

        {/* inline results */}
        {visible && (
          <ul className="max-h-64 overflow-y-auto border-t border-a-border p-1.5">
            {hits.length === 0 ? (
              <li className="px-2.5 py-3 text-[12px] text-a-muted">
                {mn.admin.overview.composerNoResults}
              </li>
            ) : (
              hits.map((hit) => (
                <li key={hit.key}>
                  <button
                    type="button"
                    onClick={() => go(hit.href)}
                    className="flex w-full items-center gap-2.5 rounded-a px-2.5 py-2 text-left transition-colors hover:bg-a-faint"
                  >
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-a-ink">
                      {hit.label}
                    </span>
                    <span className="shrink-0 text-[11px] text-a-muted">{hit.hint}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-a-muted" aria-hidden="true" />
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {/* bottom row: chips + actions */}
        <div className="flex items-center gap-2 px-3 pb-3 pt-2">
          {/* range chip */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'range' ? null : 'range')}
              aria-expanded={openMenu === 'range'}
              className="flex h-7 items-center gap-1 rounded-full border border-a-border px-2.5 text-[11.5px] font-medium text-a-muted transition-colors hover:bg-a-faint hover:text-a-ink"
            >
              {mn.admin.overview.composerRange}:{' '}
              {RANGES.find((r) => r.key === range)?.label}
              <span aria-hidden="true">⌄</span>
            </button>
            {openMenu === 'range' && (
              <div className="absolute bottom-full left-0 z-40 mb-1 w-48 rounded-a border border-a-border bg-[rgb(var(--a-panel))] p-1 shadow-a-card">
                {RANGES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setRange(item.key);
                      setOpenMenu(null);
                    }}
                    className={cn(
                      'flex h-8 w-full items-center rounded-a px-2 text-left text-[12px] transition-colors hover:bg-a-faint',
                      item.key === range ? 'font-semibold text-a-ink' : 'text-a-muted'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* scope chip */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'scope' ? null : 'scope')}
              aria-expanded={openMenu === 'scope'}
              className="flex h-7 items-center gap-1 rounded-full border border-a-border px-2.5 text-[11.5px] font-medium text-a-muted transition-colors hover:bg-a-faint hover:text-a-ink"
            >
              {mn.admin.overview.composerScope}:{' '}
              {SCOPES.find((s) => s.key === scope)?.label}
              <span aria-hidden="true">⌄</span>
            </button>
            {openMenu === 'scope' && (
              <div className="absolute bottom-full left-0 z-40 mb-1 w-40 rounded-a border border-a-border bg-[rgb(var(--a-panel))] p-1 shadow-a-card">
                {SCOPES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setScope(item.key);
                      setOpenMenu(null);
                    }}
                    className={cn(
                      'flex h-8 w-full items-center rounded-a px-2 text-left text-[12px] transition-colors hover:bg-a-faint',
                      item.key === scope ? 'font-semibold text-a-ink' : 'text-a-muted'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* "+" action menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'add' ? null : 'add')}
                aria-label={mn.admin.overview.composerAdd}
                aria-expanded={openMenu === 'add'}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-a-border text-a-muted transition-colors hover:bg-a-faint hover:text-a-ink"
              >
                <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
              {openMenu === 'add' && (
                <div className="absolute bottom-full right-0 z-40 mb-1 w-56 rounded-a border border-a-border bg-[rgb(var(--a-panel))] p-1 shadow-a-card">
                  {[
                    { href: '/notifications/broadcast', label: mn.admin.nav.broadcast },
                    { href: '/notifications/announcements', label: mn.admin.nav.announcements },
                    { href: '/categories', label: mn.admin.nav.categories },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={adminHref(item.href)}
                      onClick={() => setOpenMenu(null)}
                      className="flex h-8 items-center rounded-a px-2 text-[12px] text-a-muted transition-colors hover:bg-a-faint hover:text-a-ink"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* round orange send button */}
            <button
              type="button"
              onClick={() => {
                const first = hits[0];
                if (first) go(first.href);
              }}
              aria-label={mn.admin.overview.composerSend}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-a-primary text-a-ink transition-opacity hover:opacity-90"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
