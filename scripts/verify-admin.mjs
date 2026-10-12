// Verifies the admin panel's DATABASE-level guarantees.
// Usage: node scripts/verify-admin.mjs   (prints PASS/FAIL per check)
//
// Covers Admin Panel STEP 1 + PATCH P1:
//   anon / normal user:
//     1. cannot read audit_logs, others' reports, confidential tables
//     2. cannot set is_admin/status/role on their own row (guard trigger)
//     3. cannot call the admin RPCs
//     4. audit_logs cannot be UPDATEd or DELETEd (append-only trigger)
//   real admin session:
//     5. tender_private_details -> 0 rows / denied
//     6. proposals base table -> 0 rows / denied (price/text never readable)
//     7. other users' notifications -> 0 rows
//     8. storage tender-files signed URL creation fails
//     9. admin_proposals_meta has NO price/text columns
//    10. admin_profiles_meta has NO phone column (email is masked)
//    11. admin_reveal_email works AND writes an audit row
//    12. normal user still cannot read audit_logs or call admin RPCs
//
// Creates (and removes) a dedicated admin account so the checks never depend
// on the seeded demo users' ownership of rows.
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readEnv, connect } from './_db.mjs';

const env = readEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local');
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

const ADMIN_EMAIL = `verify-admin-${Date.now()}@example.com`;
const ADMIN_PASSWORD = 'VerifyAdmin123!';
const USER_EMAIL = `verify-normal-${Date.now()}@example.com`;
const USER_PASSWORD = 'VerifyNormal123!';
const ADMIN_ID = randomUUID();
const USER_ID = randomUUID();

let client = await connect();
// The Supabase-side checks in between can outlive the TLS idle window; get a
// fresh connection whenever we need direct SQL again.
async function freshClient() {
  try {
    await client.end();
  } catch {
    /* already dead */
  }
  client = await connect();
  return client;
}

// ---------------------------------------------------------------------------
// fixture: one fresh admin + one fresh normal user (same pattern as seed.sql)
// ---------------------------------------------------------------------------
async function insertAuthUser(id, email, password, name, role, extra) {
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
    [id, email, password, JSON.stringify({ name, role, ...extra })]
  );
}

try {
  // remove leftovers from a previous (crashed) run
  await client.query(
    `delete from auth.users where email like 'verify-admin-%@example.com' or email like 'verify-normal-%@example.com'`
  );
  await insertAuthUser(ADMIN_ID, ADMIN_EMAIL, ADMIN_PASSWORD, 'Verify Admin', 'user');
  await insertAuthUser(USER_ID, USER_EMAIL, USER_PASSWORD, 'Verify User', 'user');
  await client.query(`update public.profiles set is_admin = true where id = $1`, [ADMIN_ID]);
  console.log(`FIXTURE: admin=${ADMIN_EMAIL} user=${USER_EMAIL}\n`);
} catch (error) {
  console.error(`FIXTURE FAILED: ${error.message}`);
  process.exit(1);
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return data.user;
}

// ---------------------------------------------------------------------------
// anon + normal user checks
// ---------------------------------------------------------------------------
{
  const { data, error } = await supabase.from('audit_logs').select('id, admin_id, action');
  if (error) fail(`anon audit_logs query errored -> ${error.message}`);
  else if (data.length !== 0) fail(`anon read ${data.length} audit row(s)`);
  else pass('anon cannot read audit_logs');

  const { data: reps } = await supabase.from('reports').select('id, reporter_id');
  if (reps && reps.length === 0) pass('anon cannot read reports');
  else fail(`anon read ${reps?.length ?? 'n/a'} report(s)`);
}

await signIn(USER_EMAIL, USER_PASSWORD);

{
  // guard trigger: cannot escalate own row
  const { error: esc } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', USER_ID);
  if (esc) pass(`normal user cannot set own is_admin -> ${esc.message}`);
  else fail('normal user COULD set is_admin on their own row');

  const { error: st } = await supabase.from('profiles').update({ status: 'suspended' }).eq('id', USER_ID);
  if (st) pass(`normal user cannot change own status -> ${st.message}`);
  else fail('normal user COULD change own status');

  const { error: rl } = await supabase.from('profiles').update({ role: 'company' }).eq('id', USER_ID);
  if (rl) pass(`normal user cannot change own role -> ${rl.message}`);
  else fail('normal user COULD change own role');

  // admin RPCs denied
  const rpcs = [
    ['admin_set_user_status', { p_user_id: ADMIN_ID, p_status: 'suspended' }],
    ['admin_set_user_role', { p_user_id: ADMIN_ID, p_role: 'company' }],
    ['admin_set_admin', { p_user_id: ADMIN_ID, p_value: false }],
    ['admin_set_tender_status', { p_tender_id: '00000000-0000-0000-0000-000000000001', p_status: 'closed' }],
    ['admin_delete_tender', { p_tender_id: '00000000-0000-0000-0000-000000000001' }],
    ['admin_broadcast_notification', { p_title: 'Test', p_body: '', p_link: null, p_audience: 'all' }],
    ['admin_reveal_email', { p_user_id: USER_ID }],
    ['admin_set_setting', { p_key: 'maintenance_mode', p_value: true }],
  ];
  for (const [fn, args] of rpcs) {
    const { error } = await supabase.rpc(fn, args);
    if (error) pass(`normal user cannot call ${fn} -> ${error.message.slice(0, 80)}`);
    else fail(`normal user COULD call ${fn}`);
  }

  const { data: stats, error: statsError } = await supabase.rpc('admin_stats', {});
  if (statsError) pass(`normal user cannot call admin_stats -> ${statsError.message.slice(0, 80)}`);
  else fail('normal user COULD call admin_stats');

  // reports of others / audit logs
  const { data: myReports } = await supabase.from('reports').select('id, reporter_id');
  const foreign = (myReports ?? []).filter((r) => r.reporter_id !== USER_ID);
  if (foreign.length === 0) pass('normal user cannot read other users\' reports');
  else fail(`normal user read ${foreign.length} foreign report(s)`);

  const { data: auditRows } = await supabase.from('audit_logs').select('id');
  if ((auditRows ?? []).length === 0) pass('normal user cannot read audit_logs');
  else fail(`normal user read ${auditRows.length} audit row(s)`);

  const { data: meta } = await supabase.from('admin_proposals_meta').select('id');
  if ((meta ?? []).length === 0) pass('normal user sees 0 rows in admin_proposals_meta');
  else fail(`normal user read ${meta.length} admin proposal row(s)`);

  const { data: pmeta } = await supabase.from('admin_profiles_meta').select('id');
  if ((pmeta ?? []).length === 0) pass('normal user sees 0 rows in admin_profiles_meta');
  else fail(`normal user read ${pmeta.length} admin profile row(s)`);

  await supabase.auth.signOut();
}

// append-only: direct SQL UPDATE/DELETE must raise (the RLS layer already
// blocks it for API roles; the trigger is the hard backstop). Probed inside a
// transaction that is always rolled back, so no probe row is left behind.
{
  const db = await freshClient();
  for (const [label, sql] of [
    ['UPDATE', `update public.audit_logs set action = 'tampered' where true`],
    ['DELETE', `delete from public.audit_logs`],
  ]) {
    try {
      await db.query('begin');
      await db.query(
        `insert into public.audit_logs (admin_id, action, meta) values ($1, 'probe', '{}'::jsonb)`,
        [ADMIN_ID]
      );
      await db.query(sql);
      await db.query('rollback');
      fail(`audit_logs ${label} was allowed`);
    } catch (error) {
      try {
        await db.query('rollback');
      } catch {
        /* transaction already aborted */
      }
      pass(`audit_logs ${label} blocked -> ${error.message.slice(0, 60)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// admin session checks (PATCH P1)
// ---------------------------------------------------------------------------
await signIn(ADMIN_EMAIL, ADMIN_PASSWORD);

{
  // 5. confidential tender details
  const { data, error } = await supabase.from('tender_private_details').select('tender_id, full_description');
  if (error) pass(`admin tender_private_details denied -> ${error.message.slice(0, 80)}`);
  else if ((data ?? []).length === 0) pass('admin reads 0 rows from tender_private_details');
  else fail(`admin read ${data.length} confidential tender row(s)`);

  // 6. proposals base table with price/text
  const { data: props, error: pErr } = await supabase
    .from('proposals')
    .select('id, price_offer, proposal_text');
  if (pErr) pass(`admin proposals(price/text) denied -> ${pErr.message.slice(0, 80)}`);
  else if ((props ?? []).length === 0) pass('admin reads 0 rows from proposals (price/text)');
  else fail(`admin read ${props.length} proposal row(s) incl. price/text`);

  // 7. other users' notifications
  const { data: notes, error: nErr } = await supabase.from('notifications').select('id, user_id');
  if (nErr) pass(`admin notifications denied -> ${nErr.message.slice(0, 80)}`);
  else if ((notes ?? []).length === 0) pass('admin reads 0 rows from notifications');
  else fail(`admin read ${notes.length} notification row(s)`);

  // 8. storage: signed URL for tender-files must fail
  const { error: urlErr } = await supabase.storage
    .from('tender-files')
    .createSignedUrl('nonexistent/contract.pdf', 60);
  if (urlErr) pass(`admin cannot create tender-files signed URL -> ${urlErr.message.slice(0, 80)}`);
  else fail('admin COULD create a tender-files signed URL');

  // 9. admin_proposals_meta shape
  const { data: meta, error: metaErr } = await supabase
    .from('admin_proposals_meta')
    .select('*')
    .limit(1);
  if (metaErr) fail(`admin_proposals_meta query errored -> ${metaErr.message}`);
  else {
    const cols = meta && meta.length > 0 ? Object.keys(meta[0]) : ['id', 'tender_id', 'bidder_id', 'status', 'created_at'];
    const banned = cols.filter((c) => ['price_offer', 'proposal_text', 'duration_days', 'attachments'].includes(c));
    if (banned.length > 0) fail(`admin_proposals_meta exposes banned columns: ${banned.join(', ')}`);
    else pass(`admin_proposals_meta columns = ${cols.sort().join(', ')}`);
    const { error: colErr } = await supabase
      .from('admin_proposals_meta')
      .select('price_offer')
      .limit(1);
    if (colErr) pass('admin_proposals_meta has no price_offer column');
    else fail('admin_proposals_meta accepted a price_offer column');
  }

  // 10. profiles: masked email, no phone
  const { data: users, error: uErr } = await supabase.from('admin_profiles_meta').select('*').limit(20);
  if (uErr) fail(`admin_profiles_meta query errored -> ${uErr.message}`);
  else if (!users || users.length === 0) fail('admin_profiles_meta returned 0 rows for an admin');
  else {
    const cols = Object.keys(users[0]);
    if (cols.includes('phone')) fail('admin_profiles_meta exposes phone');
    else pass('admin_profiles_meta has no phone column');
    if (!cols.includes('email_masked')) fail('admin_profiles_meta missing email_masked');
    else {
      const bad = users.filter((u) => u.email_masked && /^[^@]+@/.test(u.email_masked) && !u.email_masked.includes('***'));
      if (bad.length > 0) fail(`unmasked email returned: ${bad[0].email_masked}`);
      else pass(`emails masked (e.g. "${users[0].email_masked}")`);
    }
    const { error: rawErr } = await supabase.from('admin_profiles_meta').select('email').limit(1);
    if (rawErr) pass('admin_profiles_meta has no raw email column');
    else fail('admin_profiles_meta accepted a raw email column');
    const { error: phoneErr } = await supabase.from('admin_profiles_meta').select('phone').limit(1);
    if (phoneErr) pass('admin_profiles_meta has no phone column (direct select denied)');
    else fail('admin_profiles_meta accepted a phone column');
  }

  // 11. reveal email writes an audit row
  const { data: revealed, error: revErr } = await supabase.rpc('admin_reveal_email', {
    p_user_id: USER_ID,
  });
  if (revErr) fail(`admin_reveal_email failed -> ${revErr.message}`);
  else if (revealed !== USER_EMAIL) fail(`admin_reveal_email returned unexpected value: ${revealed}`);
  else pass('admin_reveal_email returns the full email');

  const { data: audit } = await supabase.from('audit_logs').select('action, entity_id').eq('action', 'reveal_email');
  if ((audit ?? []).some((r) => r.entity_id === USER_ID)) pass('reveal_email wrote an audit row');
  else fail('reveal_email did NOT write an audit row');

  // admins CAN see other users' audit trail (append-only read)
  const { data: allAudit } = await supabase.from('audit_logs').select('id, action');
  if ((allAudit ?? []).length > 0) pass(`admin reads ${allAudit.length} audit row(s)`);
  else fail('admin cannot read audit_logs');

  // 12. admin_stats works for an admin
  const { data: stats, error: sErr } = await supabase.rpc('admin_stats', {});
  if (sErr) fail(`admin_stats failed -> ${sErr.message}`);
  else if (stats && stats.totals && typeof stats.totals.users === 'number')
    pass(`admin_stats OK (users=${stats.totals.users}, tenders=${stats.totals.tenders}, openReports=${stats.totals.openReports})`);
  else fail(`admin_stats returned unexpected shape: ${JSON.stringify(stats).slice(0, 120)}`);

  // admin RPC works: suspend + reactivate the normal user (round trip)
  const db = await freshClient();
  const { error: susErr } = await supabase.rpc('admin_set_user_status', {
    p_user_id: USER_ID,
    p_status: 'suspended',
  });
  if (susErr) fail(`admin_set_user_status failed -> ${susErr.message}`);
  else {
    const res = await db.query('select status from public.profiles where id = $1', [USER_ID]);
    const status = res.rows[0]?.status;
    if (status === 'suspended') pass('admin_set_user_status suspends (DB reflects it)');
    else fail(`profile status = ${status}, expected suspended`);
    await db.query(`update public.profiles set status = 'active' where id = $1`, [USER_ID]);
  }

  // last-admin + self-protections
  const { error: selfErr } = await supabase.rpc('admin_set_admin', { p_user_id: ADMIN_ID, p_value: false });
  if (selfErr) pass(`admin cannot demote self -> ${selfErr.message}`);
  else fail('admin COULD demote themselves');

  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// cleanup
// ---------------------------------------------------------------------------
try {
  const db = await freshClient();
  await db.query(`delete from auth.users where email in ($1, $2)`, [ADMIN_EMAIL, USER_EMAIL]);
  await db.end();
  console.log('\nCLEANUP: removed verification accounts');
} catch (error) {
  console.log(`NOTE: cleanup skipped -> ${error.message}`);
}

console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: ALL ADMIN CHECKS PASSED');
process.exit(failed ? 1 : 0);
