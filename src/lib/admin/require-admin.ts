import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Server-side admin access control (admin host only).
 *
 * Used by the admin panel layout, every admin page and every admin server
 * action. It is the SECOND line of defence — the first one is the database
 * (`public.is_admin()` + RLS + SECURITY DEFINER RPCs, see db/admin.sql).
 *
 * Rules (S2):
 *   - logged out            -> /login   (admin host: the browser URL is /login)
 *   - signed in, not admin  -> 404      (never 403: never reveal the panel)
 *   - admin at aal1         -> /security (enroll/verify a second factor first)
 *   - admin at aal2         -> allowed; `public.is_admin()` is true only then
 */

export type AdminSession = {
  id: string;
  email: string | null;
  name: string;
  isAdmin: boolean;
  /** Current authenticator assurance level ('aal1' = password only). */
  aal: 'aal1' | 'aal2' | null;
};

/**
 * Current session facts, or null when nobody is signed in.
 * Wrapped in React `cache()` so the layout, the page and every action of the
 * same request share one lookup instead of re-querying per component.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Own profile row: readable by RLS even at aal1, and it carries the admin
  // flag + display name for the shell.
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  const row = profile as { name?: string; is_admin?: boolean } | null;

  let aal: AdminSession['aal'] = null;
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    aal = (data?.currentLevel as AdminSession['aal']) ?? null;
  } catch {
    aal = null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    name: row?.name ?? '',
    isAdmin: row?.is_admin === true,
    aal,
  };
});

/** Roles allowed to use the panel. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();

  // Host-relative path: on the admin host this is the login page
  // (middleware rewrites /login -> /admin/login).
  if (!session) redirect('/login');
  if (!session.isAdmin) notFound();
  if (session.aal !== 'aal2') redirect('/security');

  return session;
}

/**
 * Admin pages that must stay reachable at aal1 (`/security` itself) use this
 * instead: signed-in + admin, second factor not required yet.
 */
export async function requireAdminAal1(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/login');
  if (!session.isAdmin) notFound();
  return session;
}
