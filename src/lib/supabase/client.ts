import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components (browser).
 * Only public env vars are used; secrets never reach the client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
