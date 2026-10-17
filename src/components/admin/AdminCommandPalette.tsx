'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { ADMIN_GROUPS, ADMIN_LEAVES, ADMIN_QUICK } from '@/lib/admin/nav';
import { adminHref } from '@/lib/hosts';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';

/**
 * Command palette (spec A4/A5).
 *
 * Two result sources:
 *   1. admin pages / actions — static, always available, filtered by name
 *   2. real tenders (by TITLE) and real users (by NAME) — searched live
 *
 * The live lookups only ever touch columns admins are allowed to see:
 * `tenders.title` and `admin_profiles_meta.name`. Emails, phones and any
 * confidential field are never requested, so nothing private can leak into
 * the palette even if a query were widened by mistake.
 *
 * The same component serves the centered modal (Ctrl/Cmd+K) and the inline
 * composer on the overview page (`variant="inline"`).
 */

type Result = {
  key: string;
  label: string;
  hint: string;
  href: string;
};

export function AdminCommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<Result[]>([]);

  // Static page/action results.
  const pages = useMemo<Result[]>(
    () =>
      [...ADMIN_QUICK, ...ADMIN_LEAVES].map((leaf) => ({
        key: `page:${leaf.href}`,
        label: leaf.label,
        hint: leaf.href,
        href: leaf.href,
      })),
    []
  );

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (page) => page.label.toLowerCase().includes(q) || page.hint.toLowerCase().includes(q)
    );
  }, [pages, query]);

  const results = useMemo(() => [...filteredPages, ...remote], [filteredPages, remote]);

  // Reset + focus whenever the palette opens.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    setRemote([]);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Escape closes; arrows move; Enter opens the active result.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
      if (event.key === 'Enter') {
        const target = results[active];
        if (target) {
          event.preventDefault();
          onClose();
          router.push(adminHref(target.href));
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, results, active, onClose, router]);

  // Live lookup against real rows (debounced; admin-visible columns only).
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setRemote([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      const like = `%${q}%`;

      const [tenders, users] = await Promise.all([
        supabase.from('tenders').select('id, title').ilike('title', like).limit(5),
        supabase
          .from('admin_profiles_meta')
          .select('id, name')
          .ilike('name', like)
          .limit(5),
      ]);

      if (cancelled) return;

      const next: Result[] = [];
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
      setActive(0);
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-[70] flex items-start justify-center bg-a-ink/40 px-4 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={mn.admin.tabs.open}
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="w-full max-w-xl overflow-hidden rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] shadow-a-card"
      >
        <div className="flex items-center gap-2 border-b border-a-border px-4">
          <Search className="h-4 w-4 shrink-0 text-a-muted" strokeWidth={1.75} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder={mn.admin.overview.composerPlaceholder}
            aria-label={mn.admin.tabs.open}
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[13px] text-a-ink placeholder:text-a-muted focus:outline-none"
          />
          <kbd className="rounded border border-a-border px-1.5 py-0.5 text-[10px] font-semibold text-a-muted">
            Esc
          </kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12.5px] text-a-muted">
            {mn.admin.overview.composerNoResults}
          </p>
        ) : (
          <ul className="max-h-[46vh] overflow-y-auto p-2" role="listbox">
            {results.map((result, index) => (
              <li key={result.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    onClose();
                    router.push(adminHref(result.href));
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-a px-2.5 py-2 text-left transition-colors',
                    index === active ? 'bg-a-primary-tint' : 'hover:bg-a-faint'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-a-ink">
                    {result.label}
                  </span>
                  <span className="shrink-0 text-[11px] text-a-muted">{result.hint}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-a-muted" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-a-border px-4 py-2 text-[11px] text-a-muted">
          {ADMIN_GROUPS.length} бүлэг · {pages.length} хуудас
        </div>
      </motion.div>
    </motion.div>
  );
}
