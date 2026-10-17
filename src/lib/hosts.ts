import { SITE_URL } from '@/lib/constants';

/**
 * One deployment, two hosts.
 *
 *   public site  ->  NEXT_PUBLIC_ROOT_DOMAIN   (baina.mn)
 *   admin panel  ->  NEXT_PUBLIC_ADMIN_HOST    (admin.baina.mn)
 *
 * Local dev uses `localhost:3000` (public) and `admin.localhost:3000` (admin);
 * a Vercel preview deployment follows the same `admin.<host>` rule. The whole
 * split is host-based, so the admin panel is never reachable through the public
 * hostname (see src/middleware.ts) and the public chrome never renders on the
 * admin host (see src/app/(site)/layout.tsx).
 *
 * Sessions: Supabase auth cookies are HOST-ONLY (no `domain` cookie option is
 * ever set — verified in src/lib/supabase/{client,server,middleware}.ts), so an
 * admin session and a public session are deliberately separate.
 */

export const ROOT_DOMAIN = (
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'baina.mn'
).toLowerCase();

export const ADMIN_HOST = (
  process.env.NEXT_PUBLIC_ADMIN_HOST || `admin.${ROOT_DOMAIN}`
).toLowerCase();

/** `example.com:3000` -> `example.com` (lower-cased). */
function hostnameOf(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0].trim().toLowerCase();
  return hostname.length > 0 ? hostname : null;
}

const SITE_HOSTNAME = hostnameOf(new URL(SITE_URL).hostname) ?? 'localhost';

/**
 * Hostname the admin panel answers on for the current deployment.
 * `localhost` (and any `*.localhost`, plus Vercel preview hosts) get the
 * `admin.` prefix so a single local dev server can serve both hosts.
 */
export function getAdminHostname(): string {
  if (SITE_HOSTNAME === 'localhost' || SITE_HOSTNAME.endsWith('.localhost')) {
    return 'admin.localhost';
  }
  if (SITE_HOSTNAME.endsWith('.vercel.app')) {
    return `admin.${SITE_HOSTNAME}`;
  }
  return ADMIN_HOST || `admin.${SITE_HOSTNAME}`;
}

/** True when the request's `Host` header belongs to the admin panel. */
export function isAdminHost(host: string | null | undefined): boolean {
  const hostname = hostnameOf(host);
  if (!hostname) return false;
  return hostname === getAdminHostname() || hostname === ADMIN_HOST;
}

/** Absolute URL on the public site (used from admin, emails, docs). */
export function getSiteUrl(path = '/'): string {
  const base = new URL(SITE_URL);
  base.pathname = normalizePath(path);
  base.search = '';
  base.hash = '';
  return base.toString();
}

/** Absolute URL on the admin host (used from the public site's user menu). */
export function getAdminUrl(path = '/'): string {
  const base = new URL(SITE_URL);
  base.hostname = getAdminHostname();
  base.pathname = normalizePath(path);
  base.search = '';
  base.hash = '';
  return base.toString();
}

/**
 * Admin-internal link. Admin pages live in `src/app/admin/*`, but on the admin
 * host the browser URL never shows the `/admin` prefix (middleware rewrites
 * `/users` -> `/admin/users`), so every admin link is a root-relative path.
 * Always build admin hrefs with this helper — never with `/admin/...`.
 */
export function adminHref(path = '/'): string {
  return normalizePath(path);
}

function normalizePath(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}
