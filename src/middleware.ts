import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { isAdminHost } from '@/lib/hosts';
import { mn } from '@/lib/i18n/mn';
import { RATE_LIMITS } from '@/lib/constants';

/**
 * ONE deployment, TWO hosts (see src/lib/hosts.ts):
 *
 *   public  baina.mn        -> src/app/(site)/*   (Header, Footer, assistant)
 *   admin   admin.baina.mn  -> src/app/admin/*    (own shell, own session)
 *
 * Host routing rules:
 *   - public host: any `/admin` path 404s (the panel is never advertised)
 *   - admin host:  `/` -> `/admin`, `/x` -> `/admin/x` (the browser URL keeps
 *     no prefix); a request that already contains `/admin` 404s; paths without
 *     an admin route (`/about`, `/dashboard`, `/auth/login`, `/api/...`) end in
 *     the same 404. Framework internals (`/_next/*`) and the telemetry API are
 *     served as-is.
 *   - every admin response carries `X-Robots-Tag: noindex, nofollow`.
 *
 * Sessions stay host-only: no Supabase cookie helper sets a `domain`
 * (src/lib/supabase/{client,server,middleware}.ts), so the admin host and the
 * public site authenticate independently by design.
 */

/**
 * In-memory token-bucket rate limiter keyed by IP + bucket name.
 *
 * NOTE: this Map lives in a single server instance and is lost on restart.
 * In production (serverless / multi-instance) replace with a shared store,
 * e.g. Upstash Redis — the interface stays the same: check + refill.
 */
const buckets = new Map<string, { tokens: number; lastRefill: number }>();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) {
    buckets.set(key, { tokens: limit - 1, lastRefill: now });
    return true;
  }

  const refill = ((now - bucket.lastRefill) / windowMs) * limit;
  bucket.tokens = Math.min(limit, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password'];

/**
 * Admin-host paths served without the `/admin` prefix: framework internals and
 * the routes the panel itself needs. `/robots.txt` is here so the admin host
 * can answer with its own disallow-everything rules (src/app/robots.ts); the
 * public `/sitemap.xml` deliberately 404s on the admin host.
 */
const ADMIN_PASSTHROUGH_PREFIXES = ['/_next/', '/api/telemetry', '/robots.txt'];

/**
 * A path with no matching route, so Next answers with the app's 404 page.
 * Used for both "hidden" cases above — the status has to be a real 404, and
 * nothing about the panel may leak through the response body.
 */
const HIDDEN_NOT_FOUND_PATH = '/__not-found';

/**
 * Only same-host, root-relative paths are accepted as redirect targets, so a
 * crafted `?next=` can never bounce someone to another host (e.g. from the
 * public site to the admin host, where sessions are separate anyway).
 */
function safeNextPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

/** Copy refreshed Supabase auth cookies onto a response we build ourselves. */
function carryCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

/** 404 that does not reveal whether the requested route exists. */
function hiddenNotFound(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = HIDDEN_NOT_FOUND_PATH;
  url.search = '';
  return NextResponse.rewrite(url);
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);
  // Refreshes the session cookie on every matched request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const adminHost = isAdminHost(request.headers.get('host'));
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';

  // ---------------------------------------------------------------------------
  // 1. Host routing
  // ---------------------------------------------------------------------------

  // The admin panel is never reachable through the public hostname.
  if (!adminHost && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
    return hiddenNotFound(request);
  }

  if (adminHost) {
    // On the admin host the browser URL never contains /admin.
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      return hiddenNotFound(request);
    }

    if (!ADMIN_PASSTHROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      // Cheap, hard gate: a visitor without a session on this host goes to the
      // admin login with a real 307 (no panel HTML, no client-side redirect
      // flash). The finer gates — is this account an admin? is the session at
      // aal2? — live in requireAdmin() (src/lib/admin/require-admin.ts) and in
      // the database itself.
      if (!user && pathname !== '/login') {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.search = '';
        const redirect = carryCookies(response, NextResponse.redirect(loginUrl));
        redirect.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return redirect;
      }

      const url = request.nextUrl.clone();
      url.pathname = pathname === '/' ? '/admin' : `/admin${pathname}`;
      const rewritten = carryCookies(
        response,
        NextResponse.rewrite(url, { request })
      );
      rewritten.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return rewritten;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Rate limiting
  // ---------------------------------------------------------------------------

  // Rate limiting: stricter on auth routes (login/register/forgot).
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  if (isAuthRoute) {
    const allowed = rateLimit(
      `auth:${ip}`,
      RATE_LIMITS.auth.limit,
      RATE_LIMITS.auth.windowMs
    );
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: mn.errors.rateLimited }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Rate limiting: general API limit.
  if (pathname.startsWith('/api/')) {
    const allowed = rateLimit(
      `api:${ip}`,
      RATE_LIMITS.api.limit,
      RATE_LIMITS.api.windowMs
    );
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: mn.errors.rateLimited }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Session-based route protection (public host)
  // ---------------------------------------------------------------------------

  // Protect the dashboard: logged-out users go to login (remembering where
  // they wanted to go).
  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  // Logged-in users do not need the auth pages — send them to the `next`
  // target when it is a safe same-host path, otherwise to the dashboard.
  if (user && isAuthRoute) {
    const next = safeNextPath(request.nextUrl.searchParams.get('next'));
    return NextResponse.redirect(
      new URL(next ?? '/dashboard', request.nextUrl.origin)
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Admin-host response headers
  // ---------------------------------------------------------------------------

  if (adminHost) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
