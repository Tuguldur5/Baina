'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BellOff, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeInUp } from '@/lib/animations';
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/actions/notifications';
import { formatDateTime } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';
import type { Notification } from '@/lib/types/index';

/** "Мэдэгдэл" dashboard tab. */
export function NotificationsTab({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<BellOff className="h-7 w-7" aria-hidden="true" />}
        title={mn.dashboard.notifications.emptyTitle}
        text={mn.dashboard.notifications.emptyText}
      />
    );
  }

  const unreadCount = notifications.filter((item) => !item.read).length;

  const onRead = async (id: string) => {
    setBusyId(id);
    const result = await markNotificationRead(id);
    setBusyId(null);
    if (result.ok) {
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const onReadAll = async () => {
    const result = await markAllNotificationsRead();
    if (result.ok) {
      toast.success(mn.toast.saved);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const onDelete = async (id: string) => {
    setBusyId(id);
    const result = await deleteNotification(id);
    setBusyId(null);
    if (result.ok) {
      toast.success(mn.toast.deleted);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div>
      {unreadCount > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <Badge tone="warning">
            {mn.dashboard.notifications.unread}: {unreadCount}
          </Badge>
          <Button variant="secondary" size="sm" onClick={() => void onReadAll()}>
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            {mn.dashboard.notifications.markAllRead}
          </Button>
        </div>
      )}

      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        {notifications.map((notification) => (
          <motion.li key={notification.id} variants={fadeInUp}>
            <div
              className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between ${
                notification.read ? '' : 'border-primary-200 dark:border-primary-900'
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {!notification.read && <span className="h-2 w-2 rounded-full bg-primary-500" aria-hidden="true" />}
                  <p className="font-semibold text-text">{notification.title}</p>
                </div>
                <p className="mt-1 text-sm text-muted">{notification.body}</p>
                <p className="mt-2 text-xs text-muted">
                  {formatDateTime(notification.createdAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {notification.link && (
                  <Link
                    href={notification.link}
                    className="flex min-h-tap items-center rounded-full bg-surface-2 px-4 text-xs font-semibold text-text transition-colors hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {mn.header.viewAll}
                  </Link>
                )}
                {!notification.read && (
                  <button
                    type="button"
                    onClick={() => void onRead(notification.id)}
                    disabled={busyId === notification.id}
                    aria-label={mn.dashboard.notifications.markRead}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-accent-600 transition-colors hover:bg-accent-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onDelete(notification.id)}
                  disabled={busyId === notification.id}
                  aria-label={mn.dashboard.notifications.delete}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-danger-600 transition-colors hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
