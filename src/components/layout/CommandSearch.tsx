'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CornerDownLeft, Search, X } from 'lucide-react';
import { mn } from '@/lib/i18n/mn';
import { cn } from '@/lib/utils';

/**
 * Search icon + command overlay (Ctrl/Cmd+K). Submits to `/tenders?q=` — the
 * tenders page owns query filtering; this overlay is only a fast front door.
 * Modal z-[60]: above the header (z-40) and panels (z-50), below toasts (z-70).
 */
export function CommandSearch({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Global shortcut: Ctrl/Cmd + K toggles the overlay.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close whenever navigation happens (including our own submit).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Focus input + Esc + focus trap + scroll lock while open.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 60);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    setOpen(false);
    router.push(q ? `/tenders?q=${encodeURIComponent(q)}` : '/tenders');
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={mn.header.searchOpen}
        aria-keyshortcuts="Control+K Meta+K"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          className
        )}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="command-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] flex items-start justify-center bg-navy/40 px-4 pt-[12vh] backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={mn.header.searchCommandTitle}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-surface shadow-card-hover"
            >
              <form onSubmit={submit} className="flex items-center gap-2 border-b border-border px-4">
                <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={mn.header.searchCommandPlaceholder}
                  aria-label={mn.header.searchCommandPlaceholder}
                  className="min-w-0 flex-1 bg-transparent px-1 py-4 text-sm text-text placeholder:text-muted focus:outline-none"
                />
                <button
                  type="submit"
                  className="my-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-primary-500 px-3 text-xs font-bold text-navy transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {mn.header.searchCommandSubmit}
                  <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={mn.header.closeMenu}
                  className="my-2 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>

              <nav aria-label={mn.header.searchCommandTitle} className="p-2">
                <ul className="flex flex-col">
                  {[
                    { href: "/tenders", label: mn.header.navTenders },
                    { href: "/about#how", label: mn.header.navHow },
                    { href: "/dashboard", label: mn.header.navDashboard },
                  ].map((item) => (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => go(item.href)}
                        className="flex min-h-tap w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-text transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        {item.label}
                        <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <p className="border-t border-border px-4 py-2.5 text-xs text-muted">
                {mn.header.searchCommandHint}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
