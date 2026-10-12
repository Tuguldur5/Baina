-- ============================================================================
-- Тендер байна — ADMIN PANEL + PRIVACY HARDENING
-- (Admin Panel STEP 1 + PATCH P1, applied as ONE set)
--
-- Run order: schema.sql -> rls.sql -> seed.sql -> storage.sql -> admin.sql
-- IDEMPOTENT: every statement is safe to re-run.
--
-- PRIVACY PRINCIPLE (P1): admins moderate and operate the platform; they can
-- NOT read users' confidential business data:
--   * no admin access to tender_private_details,
--   * no admin access to proposals' price_offer / proposal_text
--     (only the admin_proposals_meta view: id/tender/bidder/status/date),
--   * no admin access to other users' notifications,
--   * no admin access to the tender-files storage bucket,
--   * profiles: email is MASKED by default; full email only via the
--     admin_reveal_email() RPC (audited); phone numbers never exposed.
-- All admin mutations go through SECURITY DEFINER RPCs that re-check
-- is_admin() and write an audit_logs row. The app never uses a service-role
-- key: RLS + RPC only.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles: admin flags
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.profiles
  add column if not exists status text not null default 'active';

do $$
begin
  alter table public.profiles drop constraint if exists profiles_status_check;
  alter table public.profiles
    add constraint profiles_status_check
    check (status in ('active', 'suspended'));
end
$$;

comment on column public.profiles.is_admin is 'Platform administrator flag (never settable by the row owner — see guard trigger)';
comment on column public.profiles.status is 'active | suspended; suspended users cannot post tenders or bid';

-- ---------------------------------------------------------------------------
-- 2. public.is_admin() — the single source of truth used by RLS policies,
--    RPCs and triggers. SECURITY DEFINER so RLS on profiles cannot hide the
--    flag from the check itself.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
end;
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. PRIVILEGE ESCALATION GUARD
--    A normal user can never change is_admin / status / role of their own row
--    (the "Users can update own profile" RLS policy still lets them edit name,
--    avatar, phone...). Direct SQL sessions (auth.uid() is null — migrations /
--    the Supabase SQL editor) are exempt so the FIRST admin can be created
--    manually.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id
     or new.email is distinct from old.email then
    raise exception 'Profile identity fields cannot be changed';
  end if;

  if (new.role is distinct from old.role
      or new.is_admin is distinct from old.is_admin
      or new.status is distinct from old.status)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only administrators can change role, status or admin flag';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_identity on public.profiles;
create trigger protect_profile_identity
  before update on public.profiles
  for each row execute function public.protect_profile_identity();

-- ---------------------------------------------------------------------------
-- 4. audit_logs — append-only. Nobody updates or deletes, including admins.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  -- plain uuid (no FK): deleting an account must not UPDATE or DELETE audit
  -- rows (the append-only trigger below blocks both), so the actor id is kept
  -- as a historical reference instead.
  admin_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Drop the FK if a previous version created it (it would break account
-- deletion against the append-only trigger).
alter table public.audit_logs drop constraint if exists audit_logs_admin_id_fkey;

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);
create index if not exists audit_logs_admin_id_idx
  on public.audit_logs (admin_id);

alter table public.audit_logs enable row level security;

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
  on public.audit_logs for select to authenticated
  using (public.is_admin());

-- No INSERT policy on purpose: rows are written only by SECURITY DEFINER
-- functions (table owner bypasses RLS).
-- No UPDATE/DELETE policy on purpose + hard block below.

create or replace function public.block_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;

drop trigger if exists audit_logs_append_only on public.audit_logs;
create trigger audit_logs_append_only
  before update or delete on public.audit_logs
  for each row execute function public.block_audit_log_mutation();

-- Helper used by every admin RPC below (SECURITY DEFINER, writes one row).
create or replace function public.write_audit(
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (admin_id, action, entity_type, entity_id, meta)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_meta, '{}'::jsonb));
end;
$$;

revoke execute on function public.write_audit(text, text, uuid, jsonb) from public, anon;
grant execute on function public.write_audit(text, text, uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. reports — users flag content; admins moderate.
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  entity_type text not null check (entity_type in ('tender', 'user', 'proposal')),
  entity_id uuid not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now()
);

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);
create index if not exists reports_reporter_id_idx
  on public.reports (reporter_id);

-- One OPEN report per user per entity (a resolved/dismissed one can be filed again).
create unique index if not exists reports_one_open_per_user_entity
  on public.reports (reporter_id, entity_type, entity_id)
  where status in ('open', 'reviewing');

alter table public.reports enable row level security;

drop policy if exists "Users can file reports" on public.reports;
create policy "Users can file reports"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can read own reports" on public.reports;
create policy "Users can read own reports"
  on public.reports for select to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "Admins can read all reports" on public.reports;
create policy "Admins can read all reports"
  on public.reports for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
  on public.reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- File a report (validates + enforces the one-open-report rule with a clean
-- Mongolian error message instead of a raw unique-violation).
create or replace function public.create_report(
  p_entity_type text,
  p_entity_id uuid,
  p_reason text,
  p_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Нэвтэрээгүй байна';
  end if;

  if p_entity_type not in ('tender', 'user', 'proposal') then
    raise exception 'Буруу гомдлын төрөл';
  end if;

  if coalesce(char_length(btrim(p_reason)), 0) < 3 then
    raise exception 'Шалтгаан заавал';
  end if;

  begin
    insert into public.reports (reporter_id, entity_type, entity_id, reason, details)
    values (auth.uid(), p_entity_type, p_entity_id, btrim(p_reason), coalesce(p_details, ''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Та энэ баримт дээр аль хэдийн нээлттэй гомдол илгээсэн байна';
  end;

  return v_id;
end;
$$;

revoke execute on function public.create_report(text, uuid, text, text) from public, anon;
grant execute on function public.create_report(text, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. site_settings — admin write (only through RPCs), public read limited to
--    a whitelist exposed by the public_settings view.
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- No table-level policy for anon/authenticated: reads go through the view,
-- writes go through SECURITY DEFINER RPCs.

drop view if exists public.public_settings;
create view public.public_settings as
  select key, value, updated_at
    from public.site_settings
   where key in (
     'site_name', 'contact_email', 'support_phone',
     'maintenance_mode', 'registration_open',
     'announcement', 'assistant_enabled'
   );

create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;

  if p_key not in (
    'site_name', 'contact_email', 'support_phone',
    'maintenance_mode', 'registration_open',
    'announcement', 'assistant_enabled',
    'telemetry_retention_days'
  ) then
    raise exception 'Танигдаагүй тохиргооны түлхүүр';
  end if;

  insert into public.site_settings (key, value, updated_by, updated_at)
  values (p_key, p_value, auth.uid(), now())
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = now();

  perform public.write_audit('setting.update', 'site_settings', null,
                             jsonb_build_object('key', p_key));
end;
$$;

revoke execute on function public.admin_set_setting(text, jsonb) from public, anon;
grant execute on function public.admin_set_setting(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. categories — public read (active), admin write. Seeded with the 8
--    categories the app already ships (src/lib/categories.ts).
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text not null default 'Shapes',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "Anyone can read active categories" on public.categories;
create policy "Anyone can read active categories"
  on public.categories for select
  using (active = true);

drop policy if exists "Admins can read all categories" on public.categories;
create policy "Admins can read all categories"
  on public.categories for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert categories" on public.categories;
create policy "Admins can insert categories"
  on public.categories for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update categories" on public.categories;
create policy "Admins can update categories"
  on public.categories for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete categories" on public.categories;
create policy "Admins can delete categories"
  on public.categories for delete to authenticated
  using (public.is_admin());

insert into public.categories (name, slug, icon, sort_order) values
  ('Барилга', 'barilga', 'HardHat', 1),
  ('Технологи', 'tehnologi', 'Cpu', 2),
  ('Тээвэр', 'teever', 'Truck', 3),
  ('Худалдаа', 'hudaldaa', 'ShoppingCart', 4),
  ('Үйлчилгээ', 'uilchilgee', 'Briefcase', 5),
  ('Боловсрол', 'bolovsrol', 'GraduationCap', 6),
  ('Эрүүл мэнд', 'eruul-mend', 'HeartPulse', 7),
  ('Бусад', 'busad', 'Shapes', 8)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- 8. announcements — public read of active rows, admin write (RPC only).
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  level text not null default 'info' check (level in ('info', 'warning')),
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "Anyone can read active announcements" on public.announcements;
create policy "Anyone can read active announcements"
  on public.announcements for select
  using (active = true);

drop policy if exists "Admins can read all announcements" on public.announcements;
create policy "Admins can read all announcements"
  on public.announcements for select to authenticated
  using (public.is_admin());

create or replace function public.admin_set_announcement(
  p_id uuid,
  p_title text,
  p_body text,
  p_level text,
  p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := p_id;
begin
  if not public.is_admin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;
  if p_level not in ('info', 'warning') then
    raise exception 'Буруу түвшин';
  end if;
  if char_length(btrim(p_title)) < 3 then
    raise exception 'Гарчиг хэт богино байна';
  end if;

  if v_id is null then
    insert into public.announcements (title, body, level, active, created_by)
    values (btrim(p_title), coalesce(p_body, ''), p_level, p_active, auth.uid())
    returning id into v_id;
  else
    update public.announcements
       set title = btrim(p_title),
           body = coalesce(p_body, ''),
           level = p_level,
           active = p_active
     where id = v_id;
    if not found then
      raise exception 'Зарлал олдсонгүй';
    end if;
  end if;

  perform public.write_audit('announcement.save', 'announcement', v_id,
                             jsonb_build_object('active', p_active));
  return v_id;
end;
$$;

revoke execute on function public.admin_set_announcement(uuid, text, text, text, boolean)
  from public, anon;
grant execute on function public.admin_set_announcement(uuid, text, text, text, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 9. P1: REMOVE every admin shortcut to confidential data.
--    (No admin policies ever existed for these in a fresh install; the drops
--    make re-running after older experiments safe.)
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can read private details" on public.tender_private_details;
drop policy if exists "Admins can read all private details" on public.tender_private_details;
drop policy if exists "Admins can read all proposals" on public.proposals;
drop policy if exists "Admins can update proposals" on public.proposals;
drop policy if exists "Admins can read all notifications" on public.notifications;
drop policy if exists "Admins can read own notifications" on public.notifications;
-- Storage: no admin policy on tender-files / proposal-files is ever created;
-- drop leftovers from experiments if any exist.
drop policy if exists "Admins can read tender files" on storage.objects;
drop policy if exists "Admins can read proposal files" on storage.objects;

-- ---------------------------------------------------------------------------
-- 10. P1: admin_proposals_meta — the ONLY proposal surface for admins.
--     Exposes id, tender_id, bidder_id, status, created_at. NEVER
--     price_offer or proposal_text. SECURITY DEFINER gated by is_admin();
--     regular users get an empty result (and have no reason to query it).
-- ---------------------------------------------------------------------------
drop view if exists public.admin_proposals_meta;
create view public.admin_proposals_meta as
select p.id,
       p.tender_id,
       p.bidder_id,
       p.status,
       p.created_at
  from public.proposals p
 where public.is_admin();

-- ---------------------------------------------------------------------------
-- 11. P1: admin_profiles_meta — admin user list with MASKED email and no
--     phone column at all. Full email only via admin_reveal_email() (audited).
-- ---------------------------------------------------------------------------
create or replace function public.mask_email(p_email text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_local text;
  v_domain text;
begin
  if p_email is null then
    return null;
  end if;
  v_local := split_part(p_email, '@', 1);
  v_domain := split_part(p_email, '@', 2);
  if v_domain = '' then
    return '***';
  end if;
  return left(coalesce(nullif(v_local, ''), 'x'), 1) || '***@' || v_domain;
end;
$$;

drop view if exists public.admin_profiles_meta;
create view public.admin_profiles_meta as
select p.id,
       p.name,
       public.mask_email(p.email) as email_masked,
       p.role,
       p.status,
       p.company_name,
       p.avatar_url,
       p.is_admin,
       p.created_at,
       (select count(*) from public.tenders t where t.created_by_user_id = p.id) as tenders_count,
       (select count(*) from public.proposals pr where pr.bidder_id = p.id) as proposals_count
  from public.profiles p
 where public.is_admin();

-- P1: reveal the full email of ONE user — audited. Phone numbers are never
-- returned by any admin surface.
create or replace function public.admin_reveal_email(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;

  select email into v_email from public.profiles where id = p_user_id;
  if v_email is null then
    raise exception 'Хэрэглэгч олдсонгүй';
  end if;

  perform public.write_audit('reveal_email', 'profile', p_user_id, '{}'::jsonb);
  return v_email;
end;
$$;

revoke execute on function public.admin_reveal_email(uuid) from public, anon;
grant execute on function public.admin_reveal_email(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 12. Suspended users cannot create tenders or proposals (DB level).
--     Re-create the two INSERT policies with the status check added.
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can insert own tenders" on public.tenders;
create policy "Authenticated users can insert own tenders"
  on public.tenders for insert to authenticated
  with check (
    auth.uid() = created_by_user_id
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.status = 'active'
    )
  );

drop policy if exists "Bidder can insert own proposal while tender is open" on public.proposals;
create policy "Bidder can insert own proposal while tender is open"
  on public.proposals for insert to authenticated
  with check (
    auth.uid() = bidder_id
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.status = 'active'
    )
    and exists (
      select 1
        from public.tenders t
       where t.id = proposals.tender_id
         and t.created_by_user_id <> auth.uid()   -- cannot bid on own tender
         and t.status = 'open'
         and t.deadline > now()                   -- not expired
    )
  );

-- ---------------------------------------------------------------------------
-- 13. ADMIN RPCs — every one re-checks is_admin() and writes an audit row.
--     Admins mutate through these only (no direct UPDATE/DELETE policies on
--     tenders/profiles/proposals), so reads and writes stay separable.
-- ---------------------------------------------------------------------------

-- 13.1 suspend / activate a user
create or replace function public.admin_set_user_status(p_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;
  if p_status not in ('active', 'suspended') then
    raise exception 'Буруу төлөв';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Өөрийн бүртгэлийн төлөвийг өөрчилж болохгүй';
  end if;

  update public.profiles set status = p_status where id = p_user_id;
  if not found then
    raise exception 'Хэрэглэгч олдсонгүй';
  end if;

  perform public.write_audit('user.status', 'profile', p_user_id,
                             jsonb_build_object('status', p_status));
end;
$$;

revoke execute on function public.admin_set_user_status(uuid, text) from public, anon;
grant execute on function public.admin_set_user_status(uuid, text) to authenticated;

-- 13.2 change a user's role
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;
  if p_role not in ('user', 'company') then
    raise exception 'Буруу үүрэг';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Өөрийн үүргийг өөрчилж болохгүй';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  if not found then
    raise exception 'Хэрэглэгч олдсонгүй';
  end if;

  perform public.write_audit('user.role', 'profile', p_user_id,
                             jsonb_build_object('role', p_role));
end;
$$;

revoke execute on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- 13.3 grant / revoke the admin flag (never the last admin, never yourself)
create or replace function public.admin_set_admin(p_user_id uuid, p_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_count integer;
begin
  if not public.is_admin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Өөрийн админ эрхийг өөрчилж болохгүй';
  end if;

  if p_value = false then
    select count(*) into v_admin_count
      from public.profiles
     where is_admin = true and id <> p_user_id;
    if v_admin_count = 0 then
      raise exception 'Сүүлчийн админыг хасах боломжгүй';
    end if;
  end if;

  update public.profiles set is_admin = p_value where id = p_user_id;
  if not found then
    raise exception 'Хэрэглэгч олдсонгүй';
  end if;

  perform public.write_audit('user.admin', 'profile', p_user_id,
                             jsonb_build_object('is_admin', p_value));
end;
$$;

revoke execute on function public.admin_set_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;

-- 13.4 close / reopen a tender (stage-1 columns only; no confidential reads)
create or replace function public.admin_set_tender_status(p_tender_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;
  if p_status not in ('open', 'closed', 'awarded') then
    raise exception 'Буруу төлөв';
  end if;

  update public.tenders
     set status = p_status,
         -- reopening an expired tender makes no sense; keep the deadline intact
         deadline = case
           when p_status = 'open' and deadline < now() then now() + interval '7 days'
           else deadline
         end
   where id = p_tender_id;
  if not found then
    raise exception 'Тендер олдсонгүй';
  end if;

  perform public.write_audit('tender.status', 'tender', p_tender_id,
                             jsonb_build_object('status', p_status));
end;
$$;

revoke execute on function public.admin_set_tender_status(uuid, text) from public, anon;
grant execute on function public.admin_set_tender_status(uuid, text) to authenticated;

-- 13.5 delete a tender (cascades private details + proposals)
create or replace function public.admin_delete_tender(p_tender_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if not public.is_admin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;

  select title into v_title from public.tenders where id = p_tender_id;
  if v_title is null then
    raise exception 'Тендер олдсонгүй';
  end if;

  delete from public.tenders where id = p_tender_id;

  perform public.write_audit('tender.delete', 'tender', p_tender_id,
                             jsonb_build_object('title', v_title));
end;
$$;

revoke execute on function public.admin_delete_tender(uuid) from public, anon;
grant execute on function public.admin_delete_tender(uuid) to authenticated;

-- 13.6 broadcast a notification (RPC only — admins never read the inbox table)
create or replace function public.admin_broadcast_notification(
  p_title text,
  p_body text,
  p_link text default null,
  p_audience text default 'all'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;
  if p_audience not in ('all', 'user', 'company') then
    raise exception 'Буруу хүрээ';
  end if;
  if char_length(btrim(p_title)) < 3 then
    raise exception 'Гарчиг хэт богино байна';
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  select id, 'broadcast', btrim(p_title), coalesce(p_body, ''), p_link
    from public.profiles
   where (p_audience = 'all'
          or (p_audience = 'user' and role = 'user')
          or (p_audience = 'company' and role = 'company'));

  get diagnostics v_count = row_count;

  perform public.write_audit('broadcast', 'notification', null,
                             jsonb_build_object('audience', p_audience, 'count', v_count));
  return v_count;
end;
$$;

revoke execute on function public.admin_broadcast_notification(text, text, text, text)
  from public, anon;
grant execute on function public.admin_broadcast_notification(text, text, text, text)
  to authenticated;

-- 13.7 admin_stats() — ONE json with totals, 30-day series, distributions,
--     top categories and the open-reports count. Aggregates only; the app
--     never queries confidential tables directly for the overview.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'users', (select count(*) from public.profiles),
      'activeUsers', (select count(*) from public.profiles where status = 'active'),
      'suspendedUsers', (select count(*) from public.profiles where status = 'suspended'),
      'tenders', (select count(*) from public.tenders),
      'openTenders', (select count(*) from public.tenders where status = 'open'),
      'awardedTenders', (select count(*) from public.tenders where status = 'awarded'),
      'openBudget', coalesce((select sum(budget) from public.tenders where status = 'open'), 0),
      'proposals', (select count(*) from public.proposals),
      'openReports', (select count(*) from public.reports where status = 'open'),
      'companies', (select count(*) from public.profiles where role = 'company')
    ),
    'series', coalesce((
      select jsonb_agg(entry order by day)
        from (
          select d.day,
                 jsonb_build_object(
                   'day', to_char(d.day, 'YYYY-MM-DD'),
                   'users', (select count(*) from public.profiles p where p.created_at::date = d.day),
                   'tenders', (select count(*) from public.tenders t where t.created_at::date = d.day),
                   'proposals', (select count(*) from public.proposals pr where pr.created_at::date = d.day)
                 ) as entry
            from generate_series(current_date - interval '29 days', current_date, interval '1 day') as d(day)
        ) s
    ), '[]'::jsonb),
    'tenderStatus', coalesce((
      select jsonb_agg(jsonb_build_object('status', status, 'count', cnt))
        from (select status, count(*) as cnt from public.tenders group by status) t
    ), '[]'::jsonb),
    'proposalStatus', coalesce((
      select jsonb_agg(jsonb_build_object('status', status, 'count', cnt))
        from (select status, count(*) as cnt from public.proposals group by status) p
    ), '[]'::jsonb),
    'topCategories', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'count', cnt) order by cnt desc)
        from (select category, count(*) as cnt from public.tenders group by category order by cnt desc limit 8) c
    ), '[]'::jsonb),
    'regions', coalesce((
      select jsonb_agg(jsonb_build_object('region', region, 'count', cnt) order by cnt desc)
        from (select coalesce(region, 'Тодорхойгүй') as region, count(*) as cnt
                from public.tenders group by region order by cnt desc limit 10) r
    ), '[]'::jsonb),
    'ownerSplit', jsonb_build_object(
      'user', (select count(*) from public.tenders t join public.profiles p on p.id = t.created_by_user_id where p.role = 'user'),
      'company', (select count(*) from public.tenders t join public.profiles p on p.id = t.created_by_user_id where p.role = 'company')
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- 14. First admin is created MANUALLY (documented in README):
--       update public.profiles set is_admin = true where email = 'YOU@x.mn';
--    The guard trigger allows this only from a direct SQL session
--    (auth.uid() is null), never from an app session.
-- ---------------------------------------------------------------------------
