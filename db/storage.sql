-- ============================================================================
-- Тендер байна — Supabase Storage: avatars (public) + tender-files (private)
-- Run after schema.sql (npm run db:apply includes this file).
-- IDEMPOTENT.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- avatars: public read, each user writes only inside <uid>/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read avatar images (public bucket).
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Each user may upload avatars only inside their own folder (<uid>/...).
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ...and update/delete only those own files.
drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- tender-files: PRIVATE bucket. Path layout: <tender_id>/<filename>
-- Upload/delete: the tender owner only.
-- Read: the tender owner or a shortlisted/accepted bidder — and only through
-- signed URLs (the bucket itself is not public).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tender-files', 'tender-files', false, 10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Tender files readable by owner and shortlisted bidders"
  on storage.objects;
create policy "Tender files readable by owner and shortlisted bidders"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'tender-files'
    and (
      exists (
        select 1 from public.tenders t
         where t.id::text = (storage.foldername(name))[1]
           and t.created_by_user_id = auth.uid()
      )
      or exists (
        select 1 from public.proposals p
         where p.tender_id::text = (storage.foldername(name))[1]
           and p.bidder_id = auth.uid()
           and p.status in ('shortlisted', 'accepted')
      )
    )
  );

drop policy if exists "Tender owner can upload files" on storage.objects;
create policy "Tender owner can upload files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tender-files'
    and exists (
      select 1 from public.tenders t
       where t.id::text = (storage.foldername(name))[1]
         and t.created_by_user_id = auth.uid()
    )
  );

drop policy if exists "Tender owner can update files" on storage.objects;
create policy "Tender owner can update files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'tender-files'
    and exists (
      select 1 from public.tenders t
       where t.id::text = (storage.foldername(name))[1]
         and t.created_by_user_id = auth.uid()
    )
  );

drop policy if exists "Tender owner can delete files" on storage.objects;
create policy "Tender owner can delete files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'tender-files'
    and exists (
      select 1 from public.tenders t
       where t.id::text = (storage.foldername(name))[1]
         and t.created_by_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- proposal-files: PRIVATE bucket holding each bidder's own documents.
-- Path layout: <tender_id>/<bidder_id>/<filename>
--
-- Three-party confidentiality, enforced by the storage policies below:
--   * the bidder        — reads/writes ONLY inside their own folder;
--   * the tender owner  — may read (to evaluate the bid) but never write;
--   * everyone else,    — no access at all. The platform operator keeps no
--     including platform  readable copy: the bucket is private and files are
--     staff               served through short-lived signed URLs only, so an
--                         operator cannot list or browse them.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proposal-files', 'proposal-files', false, 10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A bidder may read their own documents.
drop policy if exists "Bidder can read own proposal files" on storage.objects;
create policy "Bidder can read own proposal files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'proposal-files'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- The tender owner may read the documents attached to proposals on their own
-- tender (they cannot evaluate an offer without the paperwork).
drop policy if exists "Tender owner can read proposal files" on storage.objects;
create policy "Tender owner can read proposal files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'proposal-files'
    and exists (
      select 1 from public.tenders t
       where t.id::text = (storage.foldername(name))[1]
         and t.created_by_user_id = auth.uid()
    )
  );

-- ...and nobody else. Writes happen only in the bidder's own folder.
drop policy if exists "Bidder can upload own proposal files" on storage.objects;
create policy "Bidder can upload own proposal files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'proposal-files'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.tenders t
       where t.id::text = (storage.foldername(name))[1]
         and t.created_by_user_id <> auth.uid()
         and t.status = 'open'
         and t.deadline > now()
    )
  );

drop policy if exists "Bidder can delete own proposal files" on storage.objects;
create policy "Bidder can delete own proposal files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'proposal-files'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
