'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, ExternalLink, Search } from 'lucide-react';
import { ADMIN_GROUPS, ADMIN_QUICK, adminGroupFor } from '@/lib/admin/nav';
import { adminHref, getSiteUrl } from '@/lib/hosts';
import { cn } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';

/**
 * Accordion sidebar (spec A3).
 *
 * Freebuff's second sidebar, rebuilt in the admin palette: logo + badge, a
 * search affordance that opens the command palette, quick items with count
 * pills, then two labelled sections of ACCORDION groups. Each group expands to
 * indented sub-items behind a thin vertical guide line.
 *
 * State rules:
 *   - the group owning the current route is always expanded
 *   - open/closed choices persist in localStorage (try/catch: private mode and
 *     storage-disabled browsers must not break navigation)
 *   - the tree is a real `role="tree"` with roving focus: Enter/Space toggles,
 *     ArrowUp/Down move, ArrowRight/Left open/close (WAI-ARIA tree pattern),
 *     and `aria-selected` marks the group owning the current route — the only
 *     row that is "selected" in a navigation tree
 */

const STORAGE_KEY = 'admin.sidebar.open';

/** Counts shown as pills next to the quick items (real data, 0 = hidden). */
export type AdminSidebarCounts = {
  openReports: number;
  newErrors: number;
};

type Props = {
  counts: AdminSidebarCounts;
  /** Opens the command palette (Ctrl/Cmd+K lives on the shell). */
  onOpenSearch: () => void;
};

function readOpenGroups(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeOpenGroups(keys: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    /* storage unavailable — the tree still works, it just forgets */
  }
}

export function AdminSidebar({ counts, onOpenSearch }: Props) {
  const pathname = usePathname();
  const activeGroup = adminGroupFor(pathname);

  // Nothing is open until mounted, so server and client render the same HTML
  // (localStorage is not readable during SSR).
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState<string[]>([]);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    setMounted(true);
    const stored = readOpenGroups();
    const owner = activeGroup?.key;
    // Always seed the owning group so a deep link lands with its context open.
    setOpen(owner && !stored.includes(owner) ? [...stored, owner] : stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the owning group expanded when the route changes (e.g. via the rail
  // or the command palette) without discarding the user's other choices.
  useEffect(() => {
    const owner = activeGroup?.key;
    if (!owner) return;
    setOpen((prev) => (prev.includes(owner) ? prev : [...prev, owner]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?.key]);

  const toggle = useCallback((key: string) => {
    setOpen((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      writeOpenGroups(next);
      return next;
    });
  }, []);

  /** Roving focus across the flattened group rows. */
  const onRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, key: string, index: number) => {
      const keys = ADMIN_GROUPS.map((g) => g.key);
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle(key);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const next = keys[(index + delta + keys.length) % keys.length];
        rowRefs.current[next ?? '']?.focus();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (!open.includes(key)) toggle(key);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (open.includes(key)) toggle(key);
      }
    },
    [open, toggle]
  );

  const isActive = (href: string) => {
    const base = href.split('?')[0] ?? href;
    const clean = pathname.split('?')[0] ?? '/';
    return clean === base;
  };

  const renderGroup = (group: (typeof ADMIN_GROUPS)[number], index: number) => {
    const expanded = mounted ? open.includes(group.key) : activeGroup?.key === group.key;
    const hasActiveChild = group.children.some((child) => isActive(child.href));

    return (
      <li key={group.key} role="none">
        <button
          ref={(el) => {
            rowRefs.current[group.key] = el;
          }}
          type="button"
          role="treeitem"
          aria-expanded={expanded}
          aria-selected={hasActiveChild}
          onClick={() => toggle(group.key)}
          onKeyDown={(event) => onRowKeyDown(event, group.key, index)}
          className={cn(
            'group flex h-9 w-full items-center gap-2.5 rounded-a px-2.5 text-left',
            'text-[13px] font-medium transition-colors',
            'hover:bg-a-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-primary/40',
            hasActiveChild ? 'text-a-ink' : 'text-a-muted'
          )}
        >
          <group.icon
            className={cn('h-[18px] w-[18px] shrink-0', hasActiveChild ? 'text-a-primary' : 'text-a-muted')}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate">{group.label}</span>
          {/* Parent dot when a child owns the current route (spec A3). */}
          {hasActiveChild && !expanded && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-a-primary" aria-hidden="true" />
          )}
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 text-a-muted transition-transform duration-200',
              expanded && 'rotate-90'
            )}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.ul
              key={`${group.key}-children`}
              role="group"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              {/* thin vertical guide line on the left (spec A3) */}
              <div className="ml-[19px] border-l border-a-border pl-2 pt-0.5">
                {group.children.map((child) => {
                  const active = isActive(child.href);
                  return (
                    <li key={child.href} role="none">
                      <Link
                        href={adminHref(child.href)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'relative flex h-8 items-center gap-2 rounded-a pl-2.5 pr-2 text-[12.5px] transition-colors',
                          active
                            ? 'bg-a-primary-tint font-semibold text-a-ink'
                            : 'text-a-muted hover:bg-a-faint hover:text-a-ink'
                        )}
                      >
                        {/* 2px orange left accent on the active sub-item */}
                        {active && (
                          <span
                            className="absolute left-0 top-1.5 h-5 w-0.5 rounded-full bg-a-primary"
                            aria-hidden="true"
                          />
                        )}
                        <child.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span className="truncate">{child.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </div>
            </motion.ul>
          )}
        </AnimatePresence>
      </li>
    );
  };

  const platform = ADMIN_GROUPS.filter((g) => g.section === 'platform');
  const system = ADMIN_GROUPS.filter((g) => g.section === 'system');

  return (
    <nav
      aria-label={mn.admin.title}
      className="flex h-full w-[280px] shrink-0 flex-col overflow-y-auto bg-[rgb(var(--a-bg))] px-3 pb-3"
    >
      {/* Logo row + badge + search */}
      <div className="flex items-center gap-2 px-1.5 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-a-primary text-[11px] font-extrabold text-a-ink">
          бн
        </span>
        <span className="truncate text-[13px] font-semibold text-a-ink">{mn.brand.name}</span>
        <span className="shrink-0 rounded-full border border-a-border bg-a-panel px-1.5 py-0.5 text-[10px] font-semibold text-a-muted">
          {mn.admin.badge}
        </span>
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label={mn.admin.sidebar.search}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-a-muted transition-colors hover:bg-a-faint hover:text-a-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-primary/40"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {/* Quick items with count pills */}
      <ul className="flex flex-col gap-0.5">
        {ADMIN_QUICK.map((item) => {
          const active = isActive(item.href);
          const count = item.href === '/reports' ? counts.openReports : 0;
          return (
            <li key={item.href}>
              <Link
                href={adminHref(item.href)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-9 items-center gap-2.5 rounded-a px-2.5 text-[13px] font-medium transition-colors',
                  active
                    ? 'bg-a-primary-tint text-a-ink'
                    : 'text-a-muted hover:bg-a-faint hover:text-a-ink'
                )}
              >
                <item.icon
                  className={cn('h-[18px] w-[18px] shrink-0', active && 'text-a-primary')}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
                {count > 0 && (
                  <span className="ml-auto rounded-full bg-a-primary-tint px-1.5 py-0.5 text-[10px] font-bold text-a-primary">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        {counts.newErrors > 0 && (
          <li>
            <Link
              href={adminHref('/system/errors')}
              className="flex h-9 items-center gap-2.5 rounded-a px-2.5 text-[13px] font-medium text-a-muted transition-colors hover:bg-a-faint hover:text-a-ink"
            >
              <span className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{mn.admin.nav.errors}</span>
              <span className="ml-auto rounded-full bg-a-danger-tint px-1.5 py-0.5 text-[10px] font-bold text-a-danger">
                {counts.newErrors}
              </span>
            </Link>
          </li>
        )}
      </ul>

      {/* Accent link to the public site */}
      <a
        href={getSiteUrl('/')}
        className="mt-1.5 flex h-9 items-center gap-2.5 rounded-a px-2.5 text-[13px] font-semibold text-a-primary transition-colors hover:bg-a-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-primary/40"
      >
        <ExternalLink className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span className="truncate">{mn.admin.backToSite}</span>
      </a>

      {/* Platform section */}
      <p className="px-2.5 pb-1 pt-4 text-[10.5px] font-bold uppercase tracking-wider text-a-muted">
        {mn.admin.sectionPlatform}
      </p>
      <ul role="tree" aria-label={mn.admin.sectionPlatform} className="flex flex-col gap-0.5">
        {platform.map((group, i) => renderGroup(group, i))}
      </ul>

      {/* System section */}
      <p className="px-2.5 pb-1 pt-4 text-[10.5px] font-bold uppercase tracking-wider text-a-muted">
        {mn.admin.sectionSystem}
      </p>
      <ul
        role="tree"
        aria-label={mn.admin.sectionSystem}
        className="flex flex-col gap-0.5 border-t border-a-border pt-2"
      >
        {system.map((group, i) => renderGroup(group, platform.length + i))}
      </ul>
    </nav>
  );
}
