-- ============================================================================
-- Тендер байна — database schema (Supabase Postgres)
-- Run order: schema.sql -> rls.sql -> seed.sql -> storage.sql
-- IDEMPOTENT: every statement is safe to re-run (migrates, never destroys).
-- ============================================================================

-- gen_random_uuid() + crypt() (password hashing for seeded auth users)
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users (credentials live in Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  name text not null,
  role text not null check (role in ('user', 'company')),
  company_name text,
  avatar_url text,
  phone text,
  is_admin boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

-- Migrations for rows created by older versions of this file
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists status text not null default 'active';

comment on column public.profiles.is_admin is 'Platform administrator flag (guarded by trigger — see admin.sql)';
comment on column public.profiles.status is 'active | suspended; suspended users cannot post or bid';

comment on table public.profiles is 'Profile data for each auth user (NOT world-readable — use public.public_tenders)';

-- ---------------------------------------------------------------------------
-- tenders (PUBLIC stage-1 information only; confidential data lives in
-- tender_private_details and is guarded by RLS)
-- ---------------------------------------------------------------------------
create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 150),
  description text not null,
  category text not null,
  budget numeric(14, 2) not null check (budget > 0),
  currency text not null default 'MNT',
  region text,
  status text not null default 'open' check (status in ('open', 'closed', 'awarded')),
  deadline timestamptz not null,
  created_by_user_id uuid not null references public.profiles (id) on delete cascade,
  winner_proposal_id uuid,
  created_at timestamptz not null default now()
);

-- Migrations for rows created by older versions of this file
alter table public.tenders add column if not exists region text;

-- Public description cap (two-tier information). Kept in sync with
-- src/lib/validators/tender.ts (TENDER_DESCRIPTION_MAX_LENGTH).
-- Dropped and re-added so an already-deployed DB converges on the new cap.
do $$
begin
  alter table public.tenders
    drop constraint if exists tenders_description_short_check;
  alter table public.tenders
    add constraint tenders_description_short_check
    check (char_length(description) <= 2000);
end
$$;

-- ---------------------------------------------------------------------------
-- tender_private_details — STAGE 2 (confidential). Only the tender owner and
-- shortlisted/accepted bidders may read it. Enforced by RLS (see rls.sql).
-- ---------------------------------------------------------------------------
create table if not exists public.tender_private_details (
  tender_id uuid primary key references public.tenders (id) on delete cascade,
  full_description text not null,
  requirements text,
  address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now()
);

comment on table public.tender_private_details is 'Confidential stage-2 tender details (owner + shortlisted/accepted bidders only)';

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders (id) on delete cascade,
  bidder_id uuid not null references public.profiles (id) on delete cascade,
  price_offer numeric(14, 2) not null check (price_offer > 0),
  proposal_text text not null,
  status text not null default 'pending'
    check (status in ('pending', 'shortlisted', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tender_id, bidder_id)
);

-- Migrations for rows created by older versions of this file
alter table public.proposals add column if not exists updated_at timestamptz not null default now();

-- How long the bidder promises to take, in days. Required by the app so two
-- offers can be compared on more than price (see PROPOSAL_TEXT_MIN_LENGTH and
-- PROPOSAL_MIN_ATTACHMENTS in src/lib/constants.ts for the rest of the bar).
alter table public.proposals add column if not exists duration_days integer;

-- Bidder's own documents (offer, licence, portfolio...). jsonb array of
-- { name, path, size } pointing into the PRIVATE `proposal-files` bucket.
alter table public.proposals add column if not exists attachments jsonb not null default '[]';

do $$
begin
  alter table public.proposals
    drop constraint if exists proposals_duration_days_check;
  alter table public.proposals
    add constraint proposals_duration_days_check
    check (duration_days is null or (duration_days > 0 and duration_days <= 3650));
end
$$;

-- Old check constraint only allowed ('pending','accepted','rejected').
alter table public.proposals drop constraint if exists proposals_status_check;
alter table public.proposals
  add constraint proposals_status_check
  check (status in ('pending', 'shortlisted', 'accepted', 'rejected'));

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists proposals_touch_updated_at on public.proposals;
create trigger proposals_touch_updated_at
  before update on public.proposals
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- notifications (created ONLY by security-definer triggers/functions below)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Circular FK (tenders -> proposals) can only be added after both tables exist
alter table public.tenders
  drop constraint if exists tenders_winner_proposal_id_fkey;
alter table public.tenders
  add constraint tenders_winner_proposal_id_fkey
  foreign key (winner_proposal_id) references public.proposals (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists tenders_status_created_at_idx
  on public.tenders (status, created_at desc);
create index if not exists tenders_category_idx
  on public.tenders (category);
create index if not exists tenders_region_idx
  on public.tenders (region);
create index if not exists tenders_created_by_user_id_idx
  on public.tenders (created_by_user_id);
create index if not exists tenders_deadline_idx
  on public.tenders (deadline);
create index if not exists proposals_tender_id_idx
  on public.proposals (tender_id);
create index if not exists proposals_bidder_id_idx
  on public.proposals (bidder_id);
create index if not exists notifications_user_read_created_idx
  on public.notifications (user_id, read, created_at desc);
create index if not exists tender_private_details_tender_id_idx
  on public.tender_private_details (tender_id);

-- Full-text search over title + description ('simple' dictionary for Mongolian)
create index if not exists tenders_search_idx
  on public.tenders
  using gin (to_tsvector('simple', title || ' ' || description));

-- ---------------------------------------------------------------------------
-- Auto-create a profile whenever a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, company_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'user'),
    new.raw_user_meta_data ->> 'company_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Protect identity fields of a profile (role / id / email cannot be edited)
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id
     or new.role <> old.role
     or new.email is distinct from old.email then
    raise exception 'Profile identity fields cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_identity on public.profiles;
create trigger protect_profile_identity
  before update on public.profiles
  for each row execute function public.protect_profile_identity();

-- ---------------------------------------------------------------------------
-- Auto-close tenders past their deadline (safe to run repeatedly; schedule
-- with pg_cron in production — see commented line below)
-- ---------------------------------------------------------------------------
create or replace function public.close_expired_tenders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.tenders
     set status = 'closed'
   where status = 'open'
     and deadline < now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Helper view: only active (open + not expired) tenders
create or replace view public.active_tenders as
  select t.*
    from public.tenders t
   where t.status = 'open'
     and t.deadline > now();

-- Schedule auto-close every minute (requires pg_cron extension):
-- select cron.schedule('close-expired-tenders', '* * * * *', $$select public.close_expired_tenders()$$);

-- ---------------------------------------------------------------------------
-- Owner name masking (two-tier information: public lists never reveal the
-- real owner). Examples: "Сайхан Барилга ХХК" -> "С*** Б*** ХХК"
--                       "Болормаа Дорж"        -> "Б*** Д."
-- ---------------------------------------------------------------------------
create or replace function public.mask_owner_name(p_name text, p_company_name text, p_role text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_full text;
  v_words text[];
  v_legal text[] := array['ХХК','ХК','ХХНХК','НХК','ТББ','ББСБ','НКО','ТӨХК','ОНӨХХК','ХХҮХК','ГМХХК','ОХХК','ББ'];
  v_out text[] := '{}';
  v_word text;
  v_idx integer := 0;
begin
  v_full := coalesce(
    nullif(case when p_role = 'company' then btrim(coalesce(p_company_name, '')) end, ''),
    nullif(btrim(coalesce(p_name, '')), '')
  );

  if v_full is null then
    return 'Нэргүй';
  end if;

  v_words := string_to_array(regexp_replace(v_full, '\s+', ' ', 'g'), ' ');

  foreach v_word in array v_words loop
    v_idx := v_idx + 1;
    if p_role = 'company' then
      if v_word = any (v_legal) then
        v_out := array_append(v_out, v_word);              -- keep the legal form readable
      else
        v_out := array_append(v_out, left(v_word, 1) || '***');
      end if;
    else
      if v_idx = 1 then
        v_out := array_append(v_out, left(v_word, 1) || '***');
      else
        v_out := array_append(v_out, left(v_word, 1) || '.');
      end if;
    end if;
  end loop;

  return array_to_string(v_out, ' ');
end;
$$;

-- ---------------------------------------------------------------------------
-- public_tenders — SAFE public read model: tender row + owner role + MASKED
-- owner name + proposals count. List/detail pages read this instead of the
-- profiles table, so the real owner name is never exposed to anonymous users.
-- SECURITY DEFINER semantics (view owner) — the real profile stays locked.
-- ---------------------------------------------------------------------------
drop view if exists public.public_tenders;
create view public.public_tenders as
select t.id,
       t.title,
       t.description,
       t.category,
       t.budget,
       t.currency,
       t.region,
       t.status,
       t.deadline,
       t.created_by_user_id,
       t.winner_proposal_id,
       t.created_at,
       coalesce(p.role, 'user') as owner_role,
       public.mask_owner_name(p.name, p.company_name, coalesce(p.role, 'user')) as owner_masked_name,
       coalesce(p.avatar_url, '') as owner_avatar_url,
       (select count(*) from public.proposals pr where pr.tender_id = t.id) as proposals_count
  from public.tenders t
  left join public.profiles p on p.id = t.created_by_user_id;

comment on column public.public_tenders.owner_masked_name is 'Masked owner display name — safe for anonymous visitors';

grant select on public.public_tenders to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Notification helpers (SECURITY DEFINER: only these may insert rows)
-- ---------------------------------------------------------------------------
create or replace function public.notify(p_user_id uuid, p_type text, p_title text, p_body text, p_link text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
end;
$$;

-- New proposal -> notify the tender owner
create or replace function public.handle_new_proposal_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_owner uuid;
begin
  select title, created_by_user_id
    into v_title, v_owner
    from public.tenders
   where id = new.tender_id;

  perform public.notify(
    v_owner,
    'proposal_received',
    'Шинэ санал ирлээ',
    format('"%s" тендер дээр шинэ санал ирлээ.', coalesce(v_title, 'Тендер')),
    '/tenders/' || new.tender_id
  );
  return new;
end;
$$;

drop trigger if exists on_proposal_insert_notify on public.proposals;
create trigger on_proposal_insert_notify
  after insert on public.proposals
  for each row execute function public.handle_new_proposal_notification();

-- Proposal status change -> notify the bidder (shortlisted / accepted / rejected)
create or replace function public.handle_proposal_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if old.status is distinct from new.status then
    select title into v_title from public.tenders where id = new.tender_id;

    if new.status = 'shortlisted' then
      perform public.notify(
        new.bidder_id, 'proposal_shortlisted',
        'Таны санал шалгаруулалтын шатанд шилжлээ',
        format('"%s" тендерийн зохион байгуулагч таны саналыг онцоллоо. Нууц мэдээлэл нээгдлээ.',
               coalesce(v_title, 'Тендер')),
        '/tenders/' || new.tender_id);
    elsif new.status = 'accepted' then
      perform public.notify(
        new.bidder_id, 'proposal_accepted',
        'Таны санал шалгарлаа',
        format('"%s" тендерийн ялагчаар таныг сонголлоо.', coalesce(v_title, 'Тендер')),
        '/tenders/' || new.tender_id);
    elsif new.status = 'rejected' then
      perform public.notify(
        new.bidder_id, 'proposal_rejected',
        'Таны санал татгалзагдлаа',
        format('"%s" тендер дээрх таны саналыг сонгоогүй байна.', coalesce(v_title, 'Тендер')),
        '/tenders/' || new.tender_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_proposal_status_notify on public.proposals;
create trigger on_proposal_status_notify
  after update of status on public.proposals
  for each row execute function public.handle_proposal_status_notification();

-- Tender closed -> notify every bidder
create or replace function public.handle_tender_closed_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal record;
begin
  if old.status is distinct from new.status and new.status = 'closed' then
    for v_proposal in
      select bidder_id from public.proposals where tender_id = new.id
    loop
      perform public.notify(
        v_proposal.bidder_id, 'tender_closed',
        'Тендер хаагдлаа',
        format('"%s" тендер хаагдсан тул шинэ санал илгээх боломжгүй.', new.title),
        '/tenders/' || new.id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists on_tender_closed_notify on public.tenders;
create trigger on_tender_closed_notify
  after update of status on public.tenders
  for each row execute function public.handle_tender_closed_notification();

-- ---------------------------------------------------------------------------
-- RPC: shortlist a proposal (owner only, atomic)
-- ---------------------------------------------------------------------------
create or replace function public.shortlist_proposal(p_proposal_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tender_id uuid;
  v_owner uuid;
  v_status text;
begin
  select tender_id, status into v_tender_id, v_status
    from public.proposals where id = p_proposal_id;

  if v_tender_id is null then
    raise exception 'Санал олдсонгүй';
  end if;

  select created_by_user_id into v_owner from public.tenders where id = v_tender_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Эрх байхгүй';
  end if;

  if v_status not in ('pending', 'shortlisted') then
    raise exception 'Энэ саналыг шалгаруулах боломжгүй';
  end if;

  update public.proposals
     set status = 'shortlisted'
   where id = p_proposal_id
     and status in ('pending', 'shortlisted');

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: award a proposal (owner only, atomic: winner accepted, tender awarded,
-- other proposals rejected — notifications fire from the status trigger)
-- ---------------------------------------------------------------------------
create or replace function public.award_proposal(p_proposal_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tender_id uuid;
  v_owner uuid;
begin
  select tender_id into v_tender_id from public.proposals where id = p_proposal_id;
  if v_tender_id is null then
    raise exception 'Санал олдсонгүй';
  end if;

  select created_by_user_id into v_owner from public.tenders where id = v_tender_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Эрх байхгүй';
  end if;

  update public.proposals
     set status = 'accepted'
   where id = p_proposal_id;

  update public.proposals
     set status = 'rejected'
   where tender_id = v_tender_id
     and id <> p_proposal_id
     and status <> 'rejected';

  update public.tenders
     set status = 'awarded',
         winner_proposal_id = p_proposal_id
   where id = v_tender_id;

  return true;
end;
$$;

grant execute on function public.shortlist_proposal(uuid) to authenticated;
grant execute on function public.award_proposal(uuid) to authenticated;
grant execute on function public.close_expired_tenders() to authenticated;
