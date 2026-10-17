// TEMPORARY (not part of the app): end-to-end check of the admin panel PAGES.
//
// Creates a throwaway admin account with a verified TOTP factor, mints the very
// same session cookie @supabase/ssr would write, then requests the admin host
// (Host: admin.localhost) and asserts what each route answers. Removes the
// fixture in a finally block and asserts zero verify-% rows remain.
//
// Usage: node tmp/verify-admin-ui.mjs      (needs `npm start` on :3000)
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import http from 'node:http';
import { readEnv, connect } from '../scripts/_db.mjs';

const PORT = Number(process.env.PORT ?? 3000);
const ADMIN_HOST = `admin.localhost:${PORT}`;
const PUBLIC_HOST = `localhost:${PORT}`;

const env = readEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  realtime: { transport: class {} },
  auth: { persistSession: false },
});

let failed = false;
const pass = (msg) => console.log(`PASS: ${msg}`);
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

const RUN_ID = `${Date.now()}-${process.pid}`;
const EMAIL = `verify-admin-${RUN_ID}@example.com`;
const PASSWORD = `VerifyAdmin-${randomBytes(12).toString('base64url')}`;
const ID = randomUUID();

let client = await connect();
let cleanupDone = false;
async function removeFixture() {
  if (cleanupDone) return;
  cleanupDone = true;
  try {
    let db = client;
    try {
      await db.query(`select 1`);
    } catch {
      db = await connect();
    }
    await db.query(`update public.profiles set is_admin = false where email like 'verify-%'`);
    await db.query(
      `delete from auth.users where email like 'verify-admin-%' or email like 'verify-normal-%'`
    );
    const res = await db.query(
      `select (select count(*)::int from auth.users where email like 'verify-%') as users, ` +
        `(select count(*)::int from public.profiles where email like 'verify-%') as profiles`
    );
    await db.end();
    const { users, profiles } = res.rows[0];
    if (users === 0 && profiles === 0) {
      console.log(`\nCLEANUP PASS: zero verify-% rows remain (users=${users}, profiles=${profiles})`);
    } else {
      fail(`verify-% rows remain (users=${users}, profiles=${profiles})`);
    }
  } catch (error) {
    fail(`cleanup -> ${error.message}`);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await removeFixture();
    process.exit(130);
  });
}

// ---------------------------------------------------------------------------
// HTTP helper: raw node:http, because fetch() refuses to set the Host header.
// ---------------------------------------------------------------------------
function get(path, { host, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method: 'GET',
        headers: {
          host: host ?? PUBLIC_HOST,
          ...(cookie ? { cookie } : {}),
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () =>
          resolve({ status: res.statusCode, location: res.headers.location, body })
        );
      }
    );
    req.on('error', reject);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// @supabase/ssr cookie format: "base64-" + base64url(JSON), chunked at 3180.
// ---------------------------------------------------------------------------
const BASE64_PREFIX = 'base64-';
const MAX_CHUNK_SIZE = 3180;

function createChunks(key, value) {
  const encodedValue = encodeURIComponent(value);
  if (encodedValue.length <= MAX_CHUNK_SIZE) return [{ name: key, value }];
  const chunks = [];
  let rest = encodedValue;
  while (rest.length > 0) {
    let head = rest.slice(0, MAX_CHUNK_SIZE);
    const lastEscape = head.lastIndexOf('%');
    if (lastEscape > MAX_CHUNK_SIZE - 3) head = head.slice(0, lastEscape);
    let decoded = '';
    while (head.length > 0) {
      try {
        decoded = decodeURIComponent(head);
        break;
      } catch {
        head = head.slice(0, head.length - 3);
      }
    }
    chunks.push(decoded);
    rest = rest.slice(head.length);
  }
  return chunks.map((value, index) => ({ name: `${key}.${index}`, value }));
}

function sessionCookie(session) {
  const projectRef = new URL(url).hostname.split('.')[0];
  const value = BASE64_PREFIX + Buffer.from(JSON.stringify(session)).toString('base64url');
  return createChunks(`sb-${projectRef}-auth-token`, value)
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}

// ---------------------------------------------------------------------------
// TOTP (RFC 6238, SHA-1, 6 digits) — same helper the admin SQL verifier uses.
// ---------------------------------------------------------------------------
function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(input).replace(/=+$/, '').replace(/[\s-]/g, '').toUpperCase();
  const bytes = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index === -1) throw new Error(`invalid base32 character: ${char}`);
    buffer = (buffer << 5) | index;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }
  return Buffer.from(bytes);
}

function totpCode(secret, at = Date.now()) {
  const counter = Math.floor(at / 1000 / 30);
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter >>> 0, 4);
  const digest = createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 1_000_000).padStart(6, '0');
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------
try {
  await client.query(
    `delete from auth.users where email like 'verify-admin-%@example.com' or email like 'verify-normal-%@example.com'`
  );
  await client.query(
    `insert into auth.users (
       instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, email_change, email_change_token_new, recovery_token
     ) values (
       '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
       $2, crypt($3, gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}',
       $4, now(), now(), '', '', '', ''
     )
     on conflict (id) do nothing`,
    [ID, EMAIL, PASSWORD, JSON.stringify({ name: 'Verify Admin UI', role: 'user' })]
  );
  await client.query(`update public.profiles set is_admin = true where id = $1`, [ID]);
  console.log(`FIXTURE: admin=${EMAIL}\n`);

  // 1. Public host must not serve the panel or its pages.
  const publicProbe = await get('/users', { host: PUBLIC_HOST });
  if (publicProbe.status === 404) pass('public host: /users -> 404 (panel hidden)');
  else fail(`public host: /users -> ${publicProbe.status} (expected 404)`);

  // 2. Admin host without a session redirects to the login page.
  const anon = await get('/tenders', { host: ADMIN_HOST });
  if (anon.status === 307 && anon.location === '/login')
    pass('admin host, no session: /tenders -> 307 /login');
  else fail(`admin host, no session: /tenders -> ${anon.status} ${anon.location ?? ''}`);

  // 3. Sign in + complete a real TOTP challenge -> aal2.
  const signIn = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signIn.error) throw new Error(`sign-in failed: ${signIn.error.message}`);

  const enroll = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `verify-ui-${Date.now()}`,
  });
  if (enroll.error || !enroll.data) throw new Error(`mfa.enroll -> ${enroll.error?.message}`);

  const challenge = await supabase.auth.mfa.challenge({ factorId: enroll.data.id });
  if (challenge.error || !challenge.data)
    throw new Error(`mfa.challenge -> ${challenge.error?.message}`);

  const verified = await supabase.auth.mfa.verify({
    factorId: enroll.data.id,
    challengeId: challenge.data.id,
    code: totpCode(enroll.data.totp.secret),
  });
  if (verified.error || !verified.data)
    throw new Error(`mfa.verify -> ${verified.error?.message}`);

  const claims = JSON.parse(
    Buffer.from(verified.data.access_token.split('.')[1], 'base64url').toString('utf8')
  );
  if (claims.aal === 'aal2') pass('session upgraded to aal2 (TOTP verified)');
  else fail(`session aal=${claims.aal} (expected aal2)`);

  const cookie = sessionCookie({
    access_token: verified.data.access_token,
    token_type: verified.data.token_type ?? 'bearer',
    expires_in: verified.data.expires_in ?? 3600,
    expires_at: Math.floor(Date.now() / 1000) + (verified.data.expires_in ?? 3600),
    refresh_token: verified.data.refresh_token,
    user: verified.data.user,
  });
  const auth = { host: ADMIN_HOST, cookie };

  // 4. Real data source behind the overview KPI strip.
  const stats = await supabase.rpc('admin_stats');
  if (stats.error) fail(`admin_stats() -> ${stats.error.message}`);
  else
    pass(
      `admin_stats() OK (users=${stats.data.totals.users}, tenders=${stats.data.totals.tenders}, openReports=${stats.data.totals.openReports})`
    );

  // 5. Every panel route, with a session.
  const routes = [
    { path: '/', must: ['Сайн байна уу'], label: 'overview (A5) renders with real session' },
    {
      path: '/users',
      must: ['Бүх хэрэглэгч', 'Имэйл', 'Бүртгэгдсэн'],
      label: 'users list renders the admins table',
    },
    { path: '/users?filter=user', must: ['Бүх хэрэглэгч'], label: 'users?filter=user renders' },
    { path: '/users?filter=company', must: ['Бүх хэрэглэгч'], label: 'users?filter=company renders' },
    { path: '/users?filter=admin', must: ['Бүх хэрэглэгч'], label: 'users?filter=admin renders' },
    { path: '/companies', must: ['Компаниуд', 'Компани'], label: 'companies list renders' },
    { path: '/tenders', must: ['Бүх тендер', 'Төсөв'], label: 'tenders list renders' },
    { path: '/reports', must: ['Гомдол'], label: 'reports page renders' },
    { path: '/audit-log', must: ['Аудит лог'], label: 'audit log page renders' },
  ];

  const notBuilt = 'хараахан бүтээгдээгүй';
  for (const route of routes) {
    const res = await get(route.path, auth);
    if (res.status !== 200) {
      fail(`${route.path} -> ${res.status} (expected 200)`);
      continue;
    }
    const missing = route.must.filter((needle) => !res.body.includes(needle));
    if (missing.length > 0) fail(`${route.path} 200 but missing: ${missing.join(', ')}`);
    else if (res.body.includes(notBuilt)) fail(`${route.path} rendered the "not built" placeholder`);
    else pass(`${route.path} -> 200 · ${route.label}`);
  }

  // 6. Nav leaves without a page of their own must land on the honest placeholder.
  const placeholders = [
    '/proposals',
    '/categories',
    '/notifications/broadcast',
    '/notifications/announcements',
    '/chatbot',
    '/system/errors',
    '/system/performance',
    '/system/analytics',
    '/system/health',
    '/settings/general',
    '/settings/mode',
  ];
  for (const path of placeholders) {
    const res = await get(path, auth);
    if (res.status !== 200) fail(`${path} -> ${res.status} (expected 200 placeholder)`);
    else if (!res.body.includes(notBuilt)) fail(`${path} 200 but no placeholder notice`);
    else pass(`${path} -> 200 · placeholder (no dead nav link)`);
  }

  // 7. A path outside the nav tree stays a real 404.
  const typo = await get('/not-a-real-section', auth);
  if (typo.status === 404) pass('unknown admin path -> 404 (not a fake section)');
  else fail(`unknown admin path -> ${typo.status} (expected 404)`);

  // 8. The server-rendered shell carries the real panel chrome.
  const shell = await get('/proposals', auth);
  for (const marker of ['admin-theme', 'aria-label="Хянах самбар"']) {
    if (shell.body.includes(marker)) pass(`shell marker present: ${marker}`);
    else fail(`shell marker missing: ${marker}`);
  }
} catch (error) {
  fail(`threw -> ${error.message}`);
} finally {
  await removeFixture();
}

console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: ALL PASS');
process.exit(failed ? 1 : 0);
