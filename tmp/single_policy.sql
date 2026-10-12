-- Isolate: recreate a bare proposals table with a single RLS policy and test
-- the exact query form that Postgres rejects as "mutual recursion".

set search_path = public;

drop table if exists public.proposals_test;
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
);

alter table public.proposals_test enable row level security;

create policy "Bidder can read own proposals"
  on public.proposals_test for select to authenticated
  using (auth.uid() = bidder_id);

create policy "Tender owner can read proposals of own tenders"
  on public.proposals_test for select to authenticated
  using (
    exists (
      select 1 from public.tenders t
       where t.id = proposals_test.tender_id
         and t.created_by_user_id = auth.uid()
    )
  );

create policy "Bidder can insert own proposal while tender is open"
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
  );

create policy "Tender owner can update proposal status"
  on public.proposals_test for update to authenticated
  using (
    exists (
      select 1 from public.tenders t
       where t.id = proposals_test.tender_id
         and t.created_by_user_id = auth.uid()
    )
  )
  with check (
    -- honor bidder ownership for text/price changes; owner can only set
    -- status on other bidders' rows through RPCs.
    proposals_test.bidder_id = auth.uid()
    or (
      exists (
        select 1 from public.tenders t
         where t.id = proposals_test.tender_id
           and t.created_by_user_id = auth.uid()
      )
      and proposals_test.bidder_id <> auth.uid()
    )
  );

-- Seed a row the test user can insert on: tender aaaa...0003, owner ganbaatar.
insert into public.proposals_test (tender_id, bidder_id, price_offer, proposal_text, status)
values ('aaaaaaa1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111112', 34000000, 'probe', 'pending')
on conflict do nothing;

-- Now insert as bolormaa (111...1111) — should fail because of bidder_id
-- mismatch, but NOT because of RLS recursion.
insert into public.proposals_test (tender_id, bidder_id, price_offer, proposal_text)
values ('aaaaaaa1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 1000, 'probe direct')
returning id;
