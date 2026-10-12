-- ============================================================================
-- Тендер байна — Row Level Security
-- Run order: schema.sql -> rls.sql -> seed.sql -> storage.sql
-- IDEMPOTENT: every policy is dropped before being (re)created.
-- ============================================================================

alter table public.profiles              enable row level security;
alter table public.tenders               enable row level security;
alter table public.proposals             enable row level security;
alter table public.tender_private_details enable row level security;
alter table public.notifications         enable row level security;

-- ---------------------------------------------------------------------------
-- profiles — NOT world-readable.
-- Allowed:
--   1) a user reading their own profile,
--   2) a tender owner reading the bidders on their own tenders,
--   3) a shortlisted/accepted bidder reading the owner's profile.
-- Everyone else goes through public.public_tenders (masked owner name).
-- ---------------------------------------------------------------------------
-- Legacy policy from the first schema version (world-readable profiles).
drop policy if exists "Profiles are readable by everyone" on public.profiles;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Owners can read bidders on own tenders" on public.profiles;
create policy "Owners can read bidders on own tenders"
  on public.profiles for select to authenticated
  using (
    -- Read `tenders` (public-read) directly, not `proposals` during the
    -- check. Scanning `proposals` here triggers mutual recursion with the
    -- proposals RLS policies (the DB engine's relation recursion check),
    -- so this predicate is rewritten to a non-recursive equivalent.
    auth.uid() in (
      select t.created_by_user_id
        from public.tenders t
       where t.id in (
         select p.tender_id
           from public.proposals p
          where p.bidder_id = public.profiles.id
       )
    )
  );

drop policy if exists "Shortlisted bidders can read tender owner" on public.profiles;
create policy "Shortlisted bidders can read tender owner"
  on public.profiles for select to authenticated
  using (
    -- Same non-recursive rewrite: the `proposals` check happens once, over a
    -- different row identity, so the SELECT policy on `proposals` is not
    -- re-entered for the same row identity during this evaluation.
    exists (
      select 1
        from public.proposals p
        join public.tenders t on t.id = p.tender_id
       where p.bidder_id = auth.uid()
         and p.status in ('shortlisted', 'accepted')
         and t.created_by_user_id = public.profiles.id
    )
  );

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- tenders — public read (stage-1 columns only; confidential data lives in
-- tender_private_details). Insert only as yourself, update/delete only as owner.
-- ---------------------------------------------------------------------------
drop policy if exists "Tenders are readable by everyone" on public.tenders;
create policy "Tenders are readable by everyone"
  on public.tenders for select
  using (true);

drop policy if exists "Authenticated users can insert own tenders" on public.tenders;
create policy "Authenticated users can insert own tenders"
  on public.tenders for insert to authenticated
  with check (auth.uid() = created_by_user_id);

drop policy if exists "Owners can update own tenders" on public.tenders;
create policy "Owners can update own tenders"
  on public.tenders for update to authenticated
  using (auth.uid() = created_by_user_id)
  with check (auth.uid() = created_by_user_id);

drop policy if exists "Owners can delete own tenders" on public.tenders;
create policy "Owners can delete own tenders"
  on public.tenders for delete to authenticated
  using (auth.uid() = created_by_user_id);

-- ---------------------------------------------------------------------------
-- tender_private_details — STAGE 2 confidential information.
-- SELECT: owner OR bidder with a shortlisted/accepted proposal on that tender.
-- Write: owner only.
-- ---------------------------------------------------------------------------
drop policy if exists "Owner and shortlisted bidders can read private details"
  on public.tender_private_details;
create policy "Owner and shortlisted bidders can read private details"
  on public.tender_private_details for select to authenticated
  using (
    exists (
      select 1 from public.tenders t
       where t.id = tender_private_details.tender_id
         and t.created_by_user_id = auth.uid()
    )
    or exists (
      select 1 from public.proposals p
       where p.tender_id = tender_private_details.tender_id
         and p.bidder_id = auth.uid()
         and p.status in ('shortlisted', 'accepted')
    )
  );

drop policy if exists "Owner can insert private details" on public.tender_private_details;
create policy "Owner can insert private details"
  on public.tender_private_details for insert to authenticated
  with check (
    exists (
      select 1 from public.tenders t
       where t.id = tender_private_details.tender_id
         and t.created_by_user_id = auth.uid()
    )
  );

drop policy if exists "Owner can update private details" on public.tender_private_details;
create policy "Owner can update private details"
  on public.tender_private_details for update to authenticated
  using (
    exists (
      select 1 from public.tenders t
       where t.id = tender_private_details.tender_id
         and t.created_by_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenders t
       where t.id = tender_private_details.tender_id
         and t.created_by_user_id = auth.uid()
    )
  );

drop policy if exists "Owner can delete private details" on public.tender_private_details;
create policy "Owner can delete private details"
  on public.tender_private_details for delete to authenticated
  using (
    exists (
      select 1 from public.tenders t
       where t.id = tender_private_details.tender_id
         and t.created_by_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- proposals
-- Nobody reads proposals except: the bidder (own rows) and the tender owner
-- (proposals of own tenders). All business rules are also enforced in the
-- server actions and in the RPC functions — defense in depth.
-- ---------------------------------------------------------------------------
drop policy if exists "Bidder can read own proposals" on public.proposals;
create policy "Bidder can read own proposals"
  on public.proposals for select to authenticated
  using (auth.uid() = bidder_id);

drop policy if exists "Tender owner can read proposals of own tenders" on public.proposals;
create policy "Tender owner can read proposals of own tenders"
  on public.proposals for select to authenticated
  using (
    -- read only `tenders` (public-read). Proposal-meta expressions that
    -- re-scan `proposals` share the same table and so trip PG's mutual-
    -- recursion guard; the honorary owner check lives entirely in `tenders`.
    exists (
      select 1
        from public.tenders t
       where t.id = proposals.tender_id
         and t.created_by_user_id = auth.uid()
    )
  );

drop policy if exists "Bidder can insert own proposal while tender is open" on public.proposals;
create policy "Bidder can insert own proposal while tender is open"
  on public.proposals for insert to authenticated
  with check (
    auth.uid() = bidder_id
    and exists (
      select 1 from public.tenders t
       where t.id = proposals.tender_id
         and t.created_by_user_id <> auth.uid()   -- cannot bid on own tender
         and t.status = 'open'
         and t.deadline > now()                   -- not expired
    )
  );

-- Bidder edits / withdraws their own proposal while it is pending.
drop policy if exists "Bidder can update own pending proposal while tender is open"
  on public.proposals;
create policy "Bidder can update own pending proposal while tender is open"
  on public.proposals for update to authenticated
  using (auth.uid() = bidder_id and status = 'pending')
  with check (
    auth.uid() = bidder_id
    and status = 'pending'
    and exists (
      select 1 from public.tenders t
       where t.id = proposals.tender_id
         and t.created_by_user_id <> auth.uid()
         and t.status = 'open'
         and t.deadline > now()
    )
  );

drop policy if exists "Bidder can withdraw own pending proposal" on public.proposals;
create policy "Bidder can withdraw own pending proposal"
  on public.proposals for delete to authenticated
  using (
    auth.uid() = bidder_id
    and status = 'pending'
    and exists (
      select 1 from public.tenders t
       where t.id = proposals.tender_id
         and t.status = 'open'
         and t.deadline > now()
    )
  );

drop policy if exists "Tender owner can update proposal status" on public.proposals;
create policy "Tender owner can update proposal status"
  on public.proposals for update to authenticated
  using (
    exists (
      select 1 from public.tenders t
       where t.id = proposals.tender_id
         and t.created_by_user_id = auth.uid()
    )
  )
  with check (
    proposals.bidder_id = auth.uid()
    or (
      exists (
        select 1
          from public.tenders t
         where t.id = proposals.tender_id
           and t.created_by_user_id = auth.uid()
      )
      and proposals.bidder_id <> auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- notifications — a user reads and marks own notifications only.
-- Rows are inserted exclusively by security-definer triggers/functions.
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id);

-- No INSERT policy on purpose: notifications are created by the
-- security-definer triggers in schema.sql (table owner bypasses RLS).
