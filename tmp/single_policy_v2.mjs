import { connect } from '../scripts/_db.mjs';

const client = await connect();
try {
  console.log('dropping test table …');
  await client.query('drop table if exists public.proposals_test');
  await client.query('create table public.proposals_test (id uuid primary key default gen_random_uuid(), tender_id uuid not null, bidder_id uuid not null, price_offer numeric(14,2) not null check (price_offer > 0), proposal_text text not null, status text not null default \'pending\' check (status in (\'pending\',\'shortlisted\',\'accepted\',\'rejected\')), created_at timestamptz not null default now(), updated_at timestamptz not null default now())');
  await client.query('alter table public.proposals_test enable row level security');
  await client.query(`
    create policy "bidder can read own"
      on public.proposals_test for select to authenticated
      using (auth.uid() = bidder_id)
  `);
  await client.query(`
    create policy "owner can read proposals of own tenders"
      on public.proposals_test for select to authenticated
      using (
        exists (
          select 1 from public.tenders t
           where t.id = proposals_test.tender_id
             and t.created_by_user_id = auth.uid()
        )
      )
  `);
  await client.query(`
    create policy "bidder can insert while open"
      on public.proposals_test for insert to authenticated
      with check (
        auth.uid() = bidder_id
        and exists (
          select 1 from public.tenders t
           where t.id = proposals_test.tender_id
             and t.created_by_user_id <> auth.uid()
             and t.status = 'open'
             and t.deadline > now()
        )
      )
  `);
  await client.query(`
    create policy "owner can update proposal status"
      on public.proposals_test for update to authenticated
      using (
        exists (
          select 1 from public.tenders t
           where t.id = proposals_test.tender_id
             and t.created_by_user_id = auth.uid()
        )
      )
      with check (
        proposals_test.bidder_id = auth.uid()
        or (
          exists (
            select 1 from public.tenders t
             where t.id = proposals_test.tender_id
               and t.created_by_user_id = auth.uid()
          )
          and proposals_test.bidder_id <> auth.uid()
        )
      )
  `);

  // Insert an existing test row (same layout as the main proposals).
  await client.query(`
    insert into public.proposals_test (tender_id, bidder_id, price_offer, proposal_text, status)
    values ('aaaaaaa1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111112', 34000000, 'probe', 'pending')
    on conflict do nothing
  `);

  // Now try the exact insert that the app performs: bowler (111..1111) inserting
  // on tender 0003, which is owned by ganbaatar (222..2222) — should pass RLS.
  const good = await client.query(`
    insert into public.proposals_test (tender_id, bidder_id, price_offer, proposal_text)
    values ('aaaaaaa1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 1000, 'probe direct v2')
    returning id
  `);
  console.log('GOOD insert (should succeed):', good.command, 'rows:', good.rowCount, 'id:', good.rows[0]?.id);

  // Then try the recursive case explicitly: any insert whose check touches
  // proposals_test via a subquery that itself is protected by RLS — currently
  // the policies above do NOT do that, so this should still succeed.
  console.log('done');
} catch (e) {
  console.log('FAIL:', e.message);
} finally {
  try { await client.query('drop table if exists public.proposals_test'); } catch {}
  await client.end();
}
