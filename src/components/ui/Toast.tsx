'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { mn } from '@/lib/i18n/mn';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = 4000;

const typeConfig: Record<
  ToastType,
  { icon: ReactNode; classes: string; label: string }
> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5 text-accent-500" aria-hidden="true" />,
    classes: 'border-accent-200 dark:border-accent-900',
    label: mn.toast.success,
  },
  error: {
    icon: <XCircle className="h-5 w-5 text-danger-500" aria-hidden="true" />,
    classes: 'border-danger-200 dark:border-danger-900',
    label: mn.toast.error,
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-warning-500" aria-hidden="true" />,
    classes: 'border-warning-200 dark:border-warning-900',
    label: mn.toast.warning,
  },
  info: {
    icon: <Info className="h-5 w-5 text-primary-500" aria-hidden="true" />,
    classes: 'border-primary-200 dark:border-primary-200',
    label: mn.toast.info,
  },
};

/**
 * Toast system: stackable, auto-dismiss after 4s with progress bar,
 * closable, accessible (role="status" + aria-live).
 * Position: top-right on desktop, bottom on mobile. z-[70].
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(1);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-4), { id, type, message }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (message: string) => toast('success', message),
      error: (message: string) => toast('error', message),
      warning: (message: string) => toast('warning', message),
      info: (message: string) => toast('info', message),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            aria-atomic="false"
            className="pointer-events-none fixed bottom-4 left-4 right-4 z-[70] flex flex-col gap-2 sm:left-auto sm:top-4 sm:bottom-auto sm:w-96"
          >
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const config = typeConfig[item.type];
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 48, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 48, scale: 0.95 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    role="status"
                    className={cn(
                      'pointer-events-auto relative overflow-hidden rounded-2xl border bg-surface p-4 shadow-card-hover',
                      config.classes
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {config.icon}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text">
                          {config.label}
                        </p>
                        <p className="mt-0.5 break-words text-sm text-muted">
                          {item.message}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => dismiss(item.id)}
                        aria-label={mn.toast.close}
                        className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    {/* auto-dismiss progress bar */}
                    <motion.div
                      initial={{ scaleX: 1 }}
                      animate={{ scaleX: 0 }}
                      transition={{
                        duration: AUTO_DISMISS_MS / 1000,
                        ease: 'linear',
                      }}
                      style={{ originX: 0 }}
                      className="absolute bottom-0 left-0 h-0.5 w-full bg-primary-gradient"
                      aria-hidden="true"
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return context;
}
