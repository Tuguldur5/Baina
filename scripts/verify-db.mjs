// Smoke-tests the Supabase connection, seed data and RLS with the anon key.
// Usage: npm run db:verify
import { createClient } from '@supabase/supabase-js';
import { readEnv } from './_db.mjs';

const env = readEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local');
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  // This script never uses Realtime; a stub transport avoids the Node < 22
  // "install ws" requirement of realtime-js.
  realtime: { transport: class {} },
  auth: { persistSession: false },
});
let failed = false;

// 1) anon can read all tenders (public read via RLS)
const { data: tenders, error: tenderError } = await supabase
  .from('tenders')
  .select('id, title, status, category')
  .order('created_at', { ascending: false });

if (tenderError) {
  console.error('FAIL: cannot read tenders ->', tenderError.message);
  failed = true;
} else {
  console.log(`PASS: anon reads ${tenders.length} tenders`);
}

// 2) full-text search index works
const { data: searchResult, error: searchError } = await supabase
  .from('tenders')
  .select('id')
  .textSearch('title', 'вэбсайт', { type: 'plain', config: 'simple' });
if (searchError) {
  console.error('FAIL: full-text search ->', searchError.message);
  failed = true;
} else {
  console.log(`PASS: full-text search returned ${searchResult.length} row(s) for "вэбсайт"`);
}

// 3) seeded user can sign in (auth.users seed + profile trigger)
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'bolormaa@example.com',
  password: 'Password123!',
});
if (authError) {
  console.error('FAIL: sign-in ->', authError.message);
  failed = true;
} else {
  console.log('PASS: seeded user signed in:', authData.user.email);
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', authData.user.id)
    .single();
  if (profileError || !profile) {
    console.error('FAIL: profile row missing ->', profileError?.message);
    failed = true;
  } else {
    console.log(`PASS: profile auto-created -> ${profile.name} (${profile.role})`);
  }

  // 4) RLS: bidding on own tender must be rejected
  const { error: ownBidError } = await supabase.from('proposals').insert({
    tender_id: 'aaaaaaa1-0000-0000-0000-000000000001', // owned by bolormaa
    bidder_id: authData.user.id,
    price_offer: 1000,
    proposal_text: 'RLS test — must be rejected',
  });
  if (ownBidError) {
    console.log('PASS: RLS blocked proposal on own tender ->', ownBidError.message);
  } else {
    console.error('FAIL: RLS allowed a proposal on own tender');
    failed = true;
  }

  // 5) bidder CAN bid on someone else's open tender (then clean up)
  const { error: foreignBidError } = await supabase.from('proposals').insert({
    tender_id: 'aaaaaaa1-0000-0000-0000-000000000003', // owned by ganbaatar
    bidder_id: authData.user.id,
    price_offer: 34000000,
    proposal_text: 'RLS test proposal — deleted right after insert',
  });
  if (foreignBidError) {
    console.error('FAIL: valid proposal rejected ->', foreignBidError.message);
    failed = true;
  } else {
    console.log('PASS: valid proposal accepted by RLS');
    // RLS lets a bidder withdraw their OWN pending proposal (see rls.sql),
    // so the test row can be removed through the client right away.
    const { error: cleanupError } = await supabase
      .from('proposals')
      .delete()
      .eq('bidder_id', authData.user.id)
      .eq('status', 'pending')
      .eq('proposal_text', 'RLS test proposal — deleted right after insert');
    if (cleanupError) {
      console.log(
        `NOTE: test row remains; clean up with: delete from public.proposals where proposal_text like 'RLS test%'; (${cleanupError.message})`
      );
    } else {
      console.log('PASS: RLS allowed the bidder to withdraw the test proposal');
    }
  }

  await supabase.auth.signOut();
}

console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: ALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
