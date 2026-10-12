import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { mn } from '@/lib/i18n/mn';
import { RATE_LIMITS } from '@/lib/constants';

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

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);
  // Refreshes the session cookie on every matched request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';

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

  // Protect the dashboard: logged-out users go to login (remembering where
  // they wanted to go).
  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  // Logged-in users do not need the auth pages — send them to the `next`
  // target when it is a safe same-site path, otherwise to the dashboard.
  if (user && isAuthRoute) {
    const nextParam = request.nextUrl.searchParams.get('next');
    const isSafeNext =
      Boolean(nextParam) &&
      nextParam!.startsWith('/') &&
      !nextParam!.startsWith('//');
    return NextResponse.redirect(
      isSafeNext
        ? new URL(nextParam!, request.nextUrl.origin)
        : new URL('/dashboard', request.nextUrl.origin)
    );
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
