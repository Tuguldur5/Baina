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

/** Connect using DATABASE_URL from .env.local; returns an open pg Client. */
export async function connect() {
  const env = readEnv();
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL not found in .env.local');
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
  // to Supabase (ETIMEDOUT). Supabase pooler hostnames may be IPv6-only, so
  // fall back to the hostname and retry — the route is flaky, not dead.
  let connectHost = host;
  try {
    connectHost = (await lookup(host, { family: 4 })).address;
  } catch {
    /* no A record — fall back to the hostname */
  }
  for (let attempt = 1; attempt <= 4; attempt += 1) {
  for (const password of candidates) {
    const client = new pg.Client({
      host: connectHost,
      port,
      user,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
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
    if (attempt < 4) {
      // ETIMEDOUT / ECONNRESET on a flaky IPv6 route: back off and retry.
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}
