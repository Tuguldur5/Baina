'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { adminHref } from '@/lib/hosts';
import { cn } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';

/**
 * Rail-bottom account control (spec A2): a rounded-square avatar showing the
 * admin's initial, opening a small menu with "Миний аюулгүй байдал" and
 * "Гарах". The MFA line is real state, not decoration.
 */
export function AdminAccountMenu({
  session,
  mfaActive,
}: {
  session: { name: string; email: string | null; initial: string };
  mfaActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={mn.admin.rail.accountMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-[10px] bg-a-ink text-[12px] font-bold text-white transition-opacity',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a-primary/40',
          open && 'ring-2 ring-a-primary/40'
        )}
      >
        {session.initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-a-card border border-a-border bg-[rgb(var(--a-panel))] p-2 shadow-a-card"
        >
          <div className="px-2 py-2">
            <p className="truncate text-[13px] font-semibold text-a-ink">
              {session.name || session.email || '—'}
            </p>
            {session.email && (
              <p className="truncate text-[11.5px] text-a-muted">{session.email}</p>
            )}
            {mfaActive && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-a-success">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {mn.admin.sidebar.adminCardMfa}
              </p>
            )}
          </div>

          <div className="my-1 border-t border-a-border" />

          <Link
            role="menuitem"
            href={adminHref('/security')}
            onClick={() => setOpen(false)}
            className="flex h-9 items-center rounded-a px-2 text-[12.5px] font-medium text-a-ink transition-colors hover:bg-a-faint"
          >
            {mn.admin.nav.security}
          </Link>

          <div className="mt-1 border-t border-a-border pt-1">
            <AdminLogoutButton
              label={mn.admin.login.logout}
              className="flex h-9 w-full items-center justify-center rounded-a bg-a-ink px-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            />
          </div>
        </div>
      )}
    </div>
  );
}
