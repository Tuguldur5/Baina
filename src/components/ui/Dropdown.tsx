'use client';

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface DropdownProps {
  /** Element that triggers the dropdown (receives aria props). */
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
  /** Extra classes for the panel (e.g. width). */
  panelClassName?: string;
  /** Dark navy panel with white text (header menus). */
  dark?: boolean;
}

/**
 * Accessible dropdown menu: opens on click, closes on outside click / Esc.
 * Used for the avatar menu and the notification bell.
 */
export function Dropdown({
  trigger,
  children,
  align = 'right',
  className,
  panelClassName,
  dark = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={cn(
              'absolute z-50 mt-2 min-w-[200px] rounded-2xl p-1.5 shadow-card-hover',
              dark
                ? 'border border-white/10 bg-navy text-white'
                : 'border border-border bg-surface',
              align === 'right' ? 'right-0' : 'left-0',
              panelClassName
            )}
            onClick={() => setOpen(false)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  href,
  danger = false,
  dark = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  dark?: boolean;
}) {
  const classes = cn(
    'flex min-h-tap w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors',
    danger
      ? dark
        ? 'text-red-300 hover:bg-white/10'
        : 'text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950'
      : dark
        ? 'text-white/80 hover:bg-white/10 hover:text-white'
        : 'text-text hover:bg-surface-2'
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

export function DropdownSeparator({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={cn('my-1 h-px', dark ? 'bg-white/10' : 'bg-border')}
      role="separator"
    />
  );
}
