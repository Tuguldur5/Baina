'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, PanelRight, Plus, ShieldCheck, X } from 'lucide-react';
import { ADMIN_RAIL, adminGroupFor, adminPageTitle } from '@/lib/admin/nav';
import { adminHref, getSiteUrl } from '@/lib/hosts';
import { cn } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';
import { AdminSidebar, type AdminSidebarCounts } from '@/components/admin/AdminSidebar';
import { AdminCommandPalette } from '@/components/admin/AdminCommandPalette';
import { AdminActivityPanel, type ActivityEntry } from '@/components/admin/AdminActivityPanel';
import { AdminAccountMenu } from '@/components/admin/AdminAccountMenu';

/**
 * Admin app shell (spec A1-A4).
 *
 * A Freebuff-style full-window frame, rebuilt light:
 *
 *   +------+-------------------------------------------------+
 *   | rail | top bar (sidebar toggle + page tabs)             |
 *   | 56px +----------------------+--------------------------+
 *   |      | sidebar 280px        | main panel (rounded 20px)|
 *   +------+----------------------+--------------------------+
 *
 * `h-dvh` with `overflow-hidden` on the frame: the page itself never scrolls,
 * only the main panel does. Below 1024px the rail and sidebar collapse into a
 * single slide-in drawer and the tab strip is replaced by the page title.
 */

const TABS_KEY = 'admin.tabs.open';
const SIDEBAR_KEY = 'admin.sidebar.collapsed';
const RIGHT_KEY = 'admin.rightPanel.open';

type Tab = { href: string; title: string };

type Props = {
  children: ReactNode;
  session: { name: string; email: string | null; initial: string; lastSignIn: string | null };
  counts: AdminSidebarCounts;
  activity: ActivityEntry[];
  mfaActive: boolean;
};

/** `localStorage`/`sessionStorage` access that never throws (private mode). */
function readJson<T>(store: 'local' | 'session', key: string, fallback: T): T {
  try {
    const raw = (store === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(store: 'local' | 'session', key: string, value: unknown): void {
  try {
    (store === 'local' ? window.localStorage : window.sessionStorage).setItem(
      key,
      JSON.stringify(value)
    );
  } catch {
    /* storage unavailable — state just does not persist */
  }
}

export function AdminShell({ children, session, counts, activity, mfaActive }: Props) {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);

  const home: Tab = useMemo(() => ({ href: '/', title: mn.admin.tabs.pinned }), []);

  // ---------------------------------------------------------------------------
  // persisted UI state (read after mount so SSR and CSR markup match)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setMounted(true);
    setCollapsed(readJson('local', SIDEBAR_KEY, false));
    setRightOpen(readJson('local', RIGHT_KEY, false));
    const stored = readJson<Tab[]>('session', TABS_KEY, []);
    setTabs(stored.length > 0 ? stored : [home]);
  }, [home]);

  useEffect(() => {
    if (!mounted) return;
    writeJson('local', SIDEBAR_KEY, collapsed);
  }, [collapsed, mounted]);

  useEffect(() => {
    if (!mounted) return;
    writeJson('local', RIGHT_KEY, rightOpen);
  }, [rightOpen, mounted]);

  useEffect(() => {
    if (!mounted) return;
    writeJson('session', TABS_KEY, tabs);
  }, [tabs, mounted]);

  // Register the current route as a tab (max 8, "Хянах самбар" pinned first).
  useEffect(() => {
    if (!mounted) return;
    const title = adminPageTitle(pathname);
    setTabs((prev) => {
      const without = prev.filter((tab) => tab.href !== pathname);
      const pinned = without.filter((tab) => tab.href === '/');
      const rest = without.filter((tab) => tab.href !== '/');
      const next = [...pinned, ...rest, { href: pathname, title }];
      // keep the pinned tab + the 7 most recent
      const limited = next.length > 8 ? [next[0]!, ...next.slice(next.length - 7)] : next;
      return limited;
    });
  }, [pathname, mounted]);

  // Ctrl/Cmd+B toggles the sidebar, Ctrl/Cmd+K opens the palette.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setCollapsed((v) => !v);
      }
      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const closeTab = useCallback(
    (href: string) => {
      setTabs((prev) => {
        if (href === '/') return prev; // pinned
        const index = prev.findIndex((tab) => tab.href === href);
        const next = prev.filter((tab) => tab.href !== href);
        // Closing the active tab falls back to its neighbour.
        if (href === pathname) {
          const neighbour = next[index - 1] ?? next[index] ?? next[0];
          if (neighbour) window.location.assign(adminHref(neighbour.href));
        }
        return next;
      });
    },
    [pathname]
  );

  const activeGroupKey = adminGroupFor(pathname)?.key;
  const railEntries = ADMIN_RAIL;

  const sidebar = (
    <AdminSidebar
      counts={counts}
      onOpenSearch={() => {
        setPaletteOpen(true);
        setDrawerOpen(false);
      }}
    />
  );

  return (
    <div className="admin-theme flex h-dvh w-full overflow-hidden bg-[rgb(var(--a-bg))] text-[13px] text-[rgb(var(--a-ink))]">
      {/* ------------------------------------------------------------------ */}
      {/* A2 — FAR-LEFT ICON RAIL                                            */}
      {/* ------------------------------------------------------------------ */}
      <aside className="hidden w-14 shrink-0 flex-col items-center gap-1 py-3 lg:flex">
        {/* logo mark tile */}
        <Link
          href={adminHref('/')}
          aria-label={mn.admin.title}
          className="mb-2 flex h-8 w-8 items-center justify-center rounded-[10px] bg-a-primary text-[11px] font-extrabold text-a-ink"
        >
          бн
        </Link>

        {railEntries.map((entry) => {
          const active =
            entry.href === '/'
              ? pathname === '/'
              : entry.groupKey === activeGroupKey;
          return (
            <div key={entry.key} className="group relative">
              <Link
                href={adminHref(entry.href)}
                aria-label={entry.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-primary/40',
                  active
                    ? 'bg-a-primary-tint text-a-primary'
                    : 'text-a-muted hover:bg-a-faint hover:text-a-ink'
                )}
              >
                <entry.icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              {/* tooltip */}
              <span
                role="tooltip"
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-a-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-a-soft transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {entry.label}
              </span>
            </div>
          );
        })}

        <div className="mt-auto flex flex-col items-center gap-1">
          <a
            href={getSiteUrl('/')}
            aria-label={mn.admin.backToSite}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-a-muted transition-colors hover:bg-a-faint hover:text-a-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-primary/40"
          >
            <ExternalLink className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-a-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-a-soft transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              {mn.admin.backToSite}
            </span>
          </a>
          <AdminAccountMenu session={session} mfaActive={mfaActive} />
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* top bar + sidebar + main panel                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* A4 — TOP BAR (48px, no border, same bg as frame) */}
        <header className="flex h-12 shrink-0 items-center gap-2 px-2">
          {/* sidebar toggle (also the mobile drawer trigger) */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? mn.admin.rail.expandSidebar : mn.admin.rail.collapseSidebar}
            aria-expanded={!collapsed}
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-a-muted transition-colors hover:bg-a-faint hover:text-a-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-primary/40 lg:flex"
          >
            <PanelRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={mn.admin.rail.openMenu}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-a-muted transition-colors hover:bg-a-faint hover:text-a-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-primary/40 lg:hidden"
          >
            <PanelRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>

          {/* Page tab strip (desktop) — replaced by the page title on mobile */}
          <nav
            aria-label={mn.admin.tabs.list}
            className="hidden min-w-0 flex-1 items-end gap-1 overflow-x-auto lg:flex"
          >
            {tabs.map((tab) => {
              const active = tab.href === pathname;
              const pinned = tab.href === '/';
              return (
                <div
                  key={tab.href}
                  className={cn(
                    'group flex h-9 shrink-0 items-center gap-1.5 rounded-t-[10px] rounded-b-none px-3',
                    active
                      ? 'bg-[rgb(var(--a-panel))] text-a-ink'
                      : 'text-a-muted hover:bg-a-faint hover:text-a-ink'
                  )}
                >
                  <Link
                    href={adminHref(tab.href)}
                    aria-current={active ? 'page' : undefined}
                    className="max-w-[180px] truncate text-[12.5px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-primary/40"
                  >
                    {tab.title}
                  </Link>
                  {!pinned && (
                    <button
                      type="button"
                      onClick={() => closeTab(tab.href)}
                      aria-label={`${mn.admin.tabs.close}: ${tab.title}`}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-a-muted opacity-0 transition-opacity hover:bg-a-border hover:text-a-ink focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </nav>
          <span className="min-w-0 flex-1 truncate px-1 text-[13px] font-semibold text-a-ink lg:hidden">
            {adminPageTitle(pathname)}
          </span>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={mn.admin.tabs.open}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-a-muted transition-colors hover:bg-a-faint hover:text-a-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-primary/40"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setRightOpen((v) => !v)}
            aria-label={mn.admin.rail.toggleRightPanel}
            aria-expanded={rightOpen}
            className={cn(
              'hidden h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-primary/40 xl:flex',
              rightOpen ? 'bg-a-primary-tint text-a-primary' : 'text-a-muted hover:bg-a-faint hover:text-a-ink'
            )}
          >
            <PanelRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>

        {/* sidebar + main + right panel */}
        <div className="flex min-h-0 flex-1">
          {/* A3 — sidebar (collapses to 0 width; the rail stays) */}
          <div
            className={cn(
              'hidden shrink-0 overflow-hidden transition-[width] duration-200 ease-out lg:block',
              collapsed ? 'w-0' : 'w-[280px]'
            )}
            aria-hidden={collapsed}
          >
            {sidebar}
          </div>

          {/* A1 — MAIN PANEL: rounded 20px, inset from the frame edges */}
          <main
            id="admin-main"
            className="mr-2 mb-2 min-w-0 flex-1 overflow-y-auto rounded-a-panel border border-a-border bg-[rgb(var(--a-panel))] shadow-a-soft"
          >
            <div className="mx-auto w-full max-w-[1280px] px-6 py-6 lg:px-8">{children}</div>
          </main>

          {/* A4 — RIGHT PANEL (>=1280px only, animated, remembered) */}
          <AnimatePresence initial={false}>
            {rightOpen && (
              <motion.aside
                key="right-panel"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="hidden shrink-0 overflow-hidden xl:block"
                aria-label={mn.admin.activity.title}
              >
                <AdminActivityPanel entries={activity} />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* mobile/tablet: rail + sidebar become ONE slide-in drawer            */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-a-ink/40 lg:hidden"
            onClick={() => setDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="flex h-full w-[280px] flex-col overflow-y-auto bg-[rgb(var(--a-bg))]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-12 items-center justify-between px-3">
                <span className="text-[13px] font-semibold text-a-ink">{mn.admin.title}</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={mn.admin.rail.closeMenu}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-a-muted hover:bg-a-faint hover:text-a-ink"
                >
                  <X className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </div>
              {sidebar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A5 — command palette (Ctrl/Cmd+K, also opened by the "+" button) */}
      <AdminCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* MFA reminder chip: honest state only, never a fake badge */}
      {!mfaActive && (
        <Link
          href={adminHref('/security')}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-a-warning-tint px-3 py-2 text-[12px] font-semibold text-a-ink shadow-a-card"
        >
          <ShieldCheck className="h-4 w-4 text-a-warning" aria-hidden="true" />
          {mn.admin.security.statusMissing}
        </Link>
      )}
    </div>
  );
}
