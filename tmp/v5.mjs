import { createClient } from '@supabase/supabase-js';
import { readEnv } from '../scripts/_db.mjs';
const env = readEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  realtime: { transport: class {} },
  auth: { persistSession: false },
});
const u = await supabase.auth.signInWithPassword({ email: 'bolormaa@example.com', password: 'Password123!' });
const userId = u.data.user.id;
console.log('user', userId);
for (const tender of [
  'aaaaaaa1-0000-0000-0000-000000000003',
  'aaaaaaa2-0000-0000-0000-000000000004',
]) {
  const r = await supabase
    .from('proposals')
    .insert({
      tender_id: tender,
      bidder_id: userId,
      price_offer: 1000,
      proposal_text: 'probe ' + Math.random().toString(36).slice(2),
    })
    .select('*')
    .maybeSingle();
  console.log(tender, r.error ? r.error.message : 'ok', r.data ? r.data.id : 'no rows');
  await supabase
    .from('proposals')
    .delete()
    .eq('bidder_id', userId)
    .eq('status', 'pending')
    .eq('proposal_text', r.data?.proposal_text ?? 'probe')
    .maybeSingle();
}
