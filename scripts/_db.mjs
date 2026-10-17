// Shared DB helper for local migration scripts. Dev-only tooling; never imported by the app.
import { readFileSync } from 'node:fs';
import { lookup } from 'node:dns/promises';
import pg from 'pg';

/** Parse .env.local / .env into a flat object (no dotenv dependency). */
export function readEnv() {
  const env = {};
  for (const file of ['.env.local', '.env']) {
    try {
      const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
      for (const line of text.split('\n')) {
        const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
        if (match && !(match[1] in env)) {
          env[match[1]] = match[2].replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      /* file missing — skip */
    }
  }
  return env;
}

/**
 * Manually parse postgresql://user:password@host:port/db because the
 * Supabase password may contain URL-special characters (#, @, /, %).
 */
export function parseDbUrl(url) {
  const withoutScheme = url.replace(/^postgres(ql)?:\/\//, '');
  const atIndex = withoutScheme.lastIndexOf('@');
  if (atIndex === -1) throw new Error('Invalid DATABASE_URL (no @)');
  const userInfo = withoutScheme.slice(0, atIndex);
  const hostInfo = withoutScheme.slice(atIndex + 1);
  const colonIndex = userInfo.indexOf(':');
  const user = colonIndex === -1 ? userInfo : userInfo.slice(0, colonIndex);
  const rawPassword = colonIndex === -1 ? '' : userInfo.slice(colonIndex + 1);
  const [host, portStr] = hostInfo.split('/');
  const [hostOnly, portPart] = host.split(':');
  const port = parseInt(portPart ?? portStr ?? '5432', 10) || 5432;
  // Supabase dashboard sometimes shows the password wrapped in brackets.
  const candidates = [rawPassword];
  const stripped = rawPassword.replace(/^\[/, '').replace(/\]$/, '');
  if (stripped !== rawPassword) candidates.push(stripped);
  return { user, host: hostOnly, port };
}

/**
 * Connect to Postgres; returns an open pg Client.
 *
 * Connection string priority:
 *   1. DATABASE_POOLER_URL — Supabase Session pooler (IPv4). Preferred: the
 *      direct `db.<ref>` hostname is IPv6-only on some projects and that route
 *      is flaky from IPv4-only networks (OS-level ETIMEDOUT).
 *   2. DATABASE_URL — direct connection, kept as a fallback.
 *
 * Every attempt is bounded (12 s) and retried with short backoff so a flaky
 * route fails fast instead of stalling the script for minutes.
 */
export async function connect() {
  const env = readEnv();
  const usingPooler = Boolean(env.DATABASE_POOLER_URL);
  const url = env.DATABASE_POOLER_URL || env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_POOLER_URL / DATABASE_URL not found in .env.local ' +
        '(Supabase Dashboard -> Connect -> Session pooler gives DATABASE_POOLER_URL)'
    );
  }
  const withoutScheme = url.replace(/^postgres(ql)?:\/\//, '');
  const atIndex = withoutScheme.lastIndexOf('@');
  const userInfo = withoutScheme.slice(0, atIndex);
  const hostInfo = withoutScheme.slice(atIndex + 1);
  const colonIndex = userInfo.indexOf(':');
  const user = colonIndex === -1 ? userInfo : userInfo.slice(0, colonIndex);
  const rawPassword = colonIndex === -1 ? '' : userInfo.slice(colonIndex + 1);
  const hostPart = hostInfo.split('/')[0];
  const [host, portStr] = hostPart.split(':');
  const port = parseInt(portStr ?? '5432', 10) || 5432;

  const candidates = [rawPassword];
  const stripped = rawPassword.replace(/^\[/, '').replace(/\]$/, '');
  if (stripped !== rawPassword) candidates.push(stripped);

  let lastError;
  // Prefer IPv4 when an A record exists: some networks drop the IPv6 route
  // to Supabase (ETIMEDOUT). The pooler hostname usually resolves to IPv4
  // already; if lookup fails we fall back to the hostname itself.
  let connectHost = host;
  try {
    connectHost = (await lookup(host, { family: 4 })).address;
  } catch {
    /* no A record — fall back to the hostname */
  }

  const MAX_ATTEMPTS = 6;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    for (const password of candidates) {
      const client = new pg.Client({
        host: connectHost,
        port,
        user,
        password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        // Bound every attempt: an IPv6-only direct route to Supabase times out
        // at the OS level (~2 min) when it is flaky, which used to stall the
        // whole script. Fail fast and let the retry loop decide.
        connectionTimeoutMillis: 12_000,
      });
      try {
        await client.connect();
        if (attempt > 1 || candidates.length > 1) {
          console.log(
            `Connected via ${usingPooler ? 'DATABASE_POOLER_URL (session pooler)' : 'DATABASE_URL (direct)'} (attempt ${attempt})`
          );
        }
        // A dropped TLS socket must not crash the script with an unhandled
        // 'error' event; callers see the query fail and can reconnect.
        client.on('error', (err) => {
          console.error(`NOTE: pg connection error -> ${err.message}`);
        });
        return client;
      } catch (error) {
        lastError = error;
        try {
          await client.end();
        } catch {
          /* ignore */
        }
      }
    }
    if (attempt < MAX_ATTEMPTS) {
      // ETIMEDOUT / ECONNRESET on a flaky route: short linear backoff, retry.
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  const hint = usingPooler
    ? ''
    : '\nHint: set DATABASE_POOLER_URL (Supabase Dashboard -> Connect -> Session pooler) for a stable IPv4 route.';
  throw new Error(`Could not connect to Postgres after ${MAX_ATTEMPTS} attempts: ${lastError?.message}${hint}`);
}
