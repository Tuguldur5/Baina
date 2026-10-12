'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { mn } from '@/lib/i18n/mn';
import type { ActionResult } from '@/lib/types/index';

/**
 * Notification server actions.
 * RLS already restricts every statement to the signed-in user's own rows;
 * these actions re-check the session and return typed ActionResults.
 */

const notificationIdSchema = z.string().uuid(mn.validation.required);

/** Revalidate the header (unread badge) + dashboard on every mutation. */
function revalidateNotifications() {
  revalidatePath('/', 'layout');
  revalidatePath('/dashboard');
}

/** Mark a single notification as read. */
export async function markNotificationRead(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const parsed = notificationIdSchema.safeParse(id);
  if (!parsed.success) {
    return { ok: false, error: mn.errors.genericText };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', parsed.data)
    .eq('user_id', user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateNotifications();
  return { ok: true, data: { id: parsed.data } };
}

/** Mark every own notification as read (bell "mark all read"). */
export async function markAllNotificationsRead(): Promise<ActionResult<{ ok: true }>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateNotifications();
  return { ok: true, data: { ok: true } };
}

/** Delete one of the user's own notifications. */
export async function deleteNotification(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const parsed = notificationIdSchema.safeParse(id);
  if (!parsed.success) {
    return { ok: false, error: mn.errors.genericText };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', parsed.data)
    .eq('user_id', user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateNotifications();
  return { ok: true, data: { id: parsed.data } };
}
