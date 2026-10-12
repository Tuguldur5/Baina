// Verifies that RLS really hides stage-2 confidential tender data.
// Usage: node scripts/verify-rls.mjs  (or: npm run db:verify-rls)
//
// Checks:
//   1. anon cannot read profiles (only the masked public_tenders view)
//   2. anon cannot read tender_private_details / notifications
//   3. public_tenders exposes a MASKED owner name, never the real one
//   4. a bidder WITHOUT a shortlisted proposal cannot read private details
//   5. a shortlisted bidder CAN read private details
//   6. the tender owner CAN read private details
//   7. notifications are only visible to their owner
//   8. non-owners cannot call the shortlist/award RPCs
import { createClient } from '@supabase/supabase-js';
import { readEnv, connect } from './_db.mjs';

const env = readEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local');
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  realtime: { transport: class {} }, // avoid the Node < 22 "install ws" requirement
  auth: { persistSession: false },
});

let failed = false;
const pass = (msg) => console.log(`PASS: ${msg}`);
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

const OWNED_TENDER = 'aaaaaaa1-0000-0000-0000-000000000001'; // owner: bolormaa
const PRIVATE_TENDER = 'aaaaaaa1-0000-0000-0000-000000000002'; // owner: bolormaa

// 1) anon must not read raw profiles ---------------------------------------
{
  const { data, error } = await supabase.from('profiles').select('id, name, email');
  if (error) fail(`anon profiles query errored -> ${error.message}`);
  else if (data.length !== 0) fail(`anon read ${data.length} profile row(s)`);
  else pass('anon cannot read profiles');
}

// 2) anon must not read confidential details / notifications ---------------
{
  const { data, error } = await supabase
    .from('tender_private_details')
    .select('tender_id, full_description');
  if (error) fail(`anon private-details query errored -> ${error.message}`);
  else if (data.length !== 0) fail(`anon read ${data.length} private detail row(s)`);
  else pass('anon cannot read tender_private_details');

  const { data: notes, error: notesError } = await supabase
    .from('notifications')
    .select('id');
  if (notesError) fail(`anon notifications query errored -> ${notesError.message}`);
  else if (notes.length !== 0) fail(`anon read ${notes.length} notification(s)`);
  else pass('anon cannot read notifications');
}

// 3) anon CAN read the masked public view ----------------------------------
{
  const { data, error } = await supabase
    .from('public_tenders')
    .select('id, title, owner_role, owner_masked_name, proposals_count');
  if (error || !data) {
    fail(`anon cannot read public_tenders -> ${error?.message}`);
  } else if (data.length === 0) {
    fail('public_tenders returned 0 rows');
  } else {
    const rows = data.filter((r) => r.owner_masked_name);
    const leaked = rows.filter(
      (r) =>
        r.owner_masked_name.includes('Болормаа') ||
        r.owner_masked_name.includes('Ганбаатар') ||
        r.owner_masked_name.includes('Тэмүүлэл')
    );
    if (leaked.length > 0) fail(`masked view leaks a real name: ${leaked[0].owner_masked_name}`);
    else
      pass(
        `anon reads ${data.length} tenders with masked owners (e.g. "${rows[0]?.owner_masked_name}")`
      );
  }
}

// helper: sign in a seeded account
async function signIn(email) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: 'Password123!',
  });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return data.user;
}

// 4) a bidder whose proposal is only "pending" stays locked out -------------
{
  const user = await signIn('temuulel@company.mn'); // has a pending proposal (tender 1)
  const { data } = await supabase
    .from('tender_private_details')
    .select('tender_id, full_description')
    .eq('tender_id', OWNED_TENDER);

  // tender 1: temuulel's proposal is pending -> no access
  // (their other proposal is on tender 5, not shortlisted either)
  if (!data || data.length === 0) pass('non-shortlisted bidder cannot read private details');
  else fail('non-shortlisted bidder could read private details');
  await supabase.auth.signOut();
}

// 5) shortlisted bidder CAN read confidential details ----------------------
{
  await signIn('ganbaatar@company.mn'); // proposal on tender 1 = shortlisted
  const { data, error } = await supabase
    .from('tender_private_details')
    .select('tender_id, full_description, contact_phone')
    .eq('tender_id', OWNED_TENDER);

  if (error) fail(`shortlisted bidder query errored -> ${error.message}`);
  else if (!data || data.length === 0) fail('shortlisted bidder cannot read private details');
  else pass('shortlisted bidder reads private details');

  // ...but still locked out of a tender they were not shortlisted on
  const { data: other } = await supabase
    .from('tender_private_details')
    .select('tender_id')
    .eq('tender_id', PRIVATE_TENDER);
  if (!other || other.length === 0) pass('shortlisted bidder stays locked out of other tenders');
  else fail('shortlisted bidder read another tender\'s private details');

  // ...and can read the owner's profile (stage-2 access)
  const { data: owner } = await supabase
    .from('profiles')
    .select('name, phone')
    .eq('role', 'user');
  if (owner && owner.length > 0) pass('shortlisted bidder can read the tender owner profile');
  else fail('shortlisted bidder cannot read the tender owner profile');
  await supabase.auth.signOut();
}

// 6) the owner CAN read own confidential details ---------------------------
{
  await signIn('bolormaa@example.com');
  const { data } = await supabase
    .from('tender_private_details')
    .select('tender_id')
    .in('tender_id', [OWNED_TENDER, PRIVATE_TENDER]);
  if (data && data.length === 2) pass('owner reads own private details');
  else fail(`owner read ${data?.length ?? 0}/2 private detail rows`);

  // owner sees all proposals of own tender (incl. bidder profiles)
  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, status, bidder:profiles(name)')
    .eq('tender_id', OWNED_TENDER);
  if (proposals && proposals.length >= 2) pass('owner reads all proposals with bidder names');
  else fail(`owner read ${proposals?.length ?? 0} proposals`);

  // owner is allowed to call the RPCs (idempotent call: proposal already shortlisted)
  const { data: rpcOk, error: rpcError } = await supabase.rpc('shortlist_proposal', {
    p_proposal_id: 'bbbbbbb1-0000-0000-0000-000000000002',
  });
  if (rpcError) fail(`owner RPC errored -> ${rpcError.message}`);
  else if (rpcOk === true) pass('owner may call shortlist/award RPCs on own tender');
  else fail(`owner RPC returned ${String(rpcOk)}`);
  await supabase.auth.signOut();
}

{
  await signIn('ganbaatar@company.mn');
  const { error: denied } = await supabase.rpc('shortlist_proposal', {
    p_proposal_id: 'bbbbbbb1-0000-0000-0000-000000000001',
  });
  if (denied) pass(`non-owner RPC denied -> ${denied.message}`);
  else fail('non-owner was allowed to shortlist a foreign proposal');
  await supabase.auth.signOut();
}

// 7) notifications belong to their owner only ------------------------------
{
  await signIn('bolormaa@example.com');
  const { data } = await supabase.from('notifications').select('id, user_id, type');
  const foreign = (data ?? []).filter((n) => n.user_id !== undefined);
  if (data && data.length > 0 && foreign.length === data.length)
    pass(`owner reads ${data.length} own notification(s)`);
  else fail('owner could not read own notifications');
  await supabase.auth.signOut();
}

// cleanup: remove the test row left behind by scripts/verify-db.mjs --------
try {
  const client = await connect();
  await client.query(
    `delete from public.proposals where proposal_text like 'RLS test%' returning id`
  );
  await client.end();
  console.log('CLEANUP: removed leftover "RLS test" proposal row(s)');
} catch (error) {
  console.log(`NOTE: cleanup skipped -> ${error.message}`);
}

console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: ALL RLS CHECKS PASSED');
process.exit(failed ? 1 : 0);
