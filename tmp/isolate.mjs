import { connect } from '../scripts/_db.mjs';
const c = await connect();
try {
  await c.query('drop table if exists public.proposals_test');
  await c.query(`
    create table public.proposals_test (
      id uuid primary key default gen_random_uuid(),
      tender_id uuid not null,
      bidder_id uuid not null,
      price_offer numeric(14,2) not null check (price_offer > 0),
      proposal_text text not null,
      status text not null default 'pending'
        check (status in ('pending','shortlisted','accepted','rejected')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await c.query('alter table public.proposals_test enable row level security');

  // Policy 1: bidder reads own
  await c.query(`
    create policy "bidder can read own"
      on public.proposals_test for select to authenticated
      using (auth.uid() = bidder_id)
  `);

  // Policy 2: tender owner reads proposals of own tender
  await c.query(`
    create policy "owner can read proposals of own tenders"
      on public.proposals_test for select to authenticated
      using (
        exists (
          select 1
            from public.tenders t
           where t.id = proposals_test.tender_id
             and t.created_by_user_id = auth.uid()
        )
      )
  `);

  // Policy 3: insert (bidder can bid on own tender? no; tender open; deadline future)
  await c.query(`
    create policy "bidder can insert while open"
      on public.proposals_test for insert to authenticated
      with check (
        auth.uid() = bidder_id
        and exists (
          select 1
            from public.tenders t
           where t.id = proposals_test.tender_id
             and t.created_by_user_id <> auth.uid()   -- cannot bid on own tender
             and t.status = 'open'
             and t.deadline > now()
        )
      )
  `);

  // Policy 4: update (owner changes status) — keep it simple
  await c.query(`
    create policy "owner can update proposal status"
      on public.proposals_test for update to authenticated
      using (
        exists (
          select 1
            from public.tenders t
           where t.id = proposals_test.tender_id
             and t.created_by_user_id = auth.uid()
        )
      )
  `);



  // bolormaa (111..1111) tries to insert on own tender 0001 (owned by 111..1111) — must be rejected
  const own = await c.query(`
    insert into public.proposals_test (tender_id, bidder_id, price_offer, proposal_text)
    values ('aaaaaaa1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 1000, 'probe own')
    returning id
  `);
  console.log('own tender insert (should FAIL):', own.error ? own.error.message : 'FAIL rowCount=' + own.rowCount);
} catch (e) {
  console.log('ERROR:', e.message);
} finally {
  try { await c.query('drop table if exists public.proposals_test'); } catch {}
  await c.end();
}
