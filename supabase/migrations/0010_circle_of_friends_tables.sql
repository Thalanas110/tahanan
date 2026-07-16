-- Tahanan: Separate COF Tables
-- Undo the polymorphic "type" approach on couples and create dedicated tables
-- for Circle of Friends rooms.

-- 1. Create cofs and cof_members tables
create table if not exists cofs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique,
  created_by uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists cof_members (
  id uuid primary key default gen_random_uuid(),
  cof_id uuid references cofs(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'partner',
  created_at timestamptz default now(),
  unique(cof_id, user_id)
);

-- Enforce a user can only be in ONE cof at a time (like how couple_members used to be)
alter table cof_members add constraint cof_members_user_id_unique unique (user_id);

-- Enforce COF can only have two members
create or replace function public.enforce_cof_member_limit()
returns trigger as $$
begin
  if (select count(*) from cof_members where cof_id = new.cof_id) >= 2 then
    raise exception 'A COF can only have two members';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_cof_member_limit on cof_members;
create trigger trg_cof_member_limit
  before insert on cof_members
  for each row execute procedure public.enforce_cof_member_limit();

-- 2. Clean up old polymorphic type logic
-- Delete any COF rows accidentally created in couples
delete from couples where type = 'cof';

-- Remove the unique constraint added in 0009
alter table couple_members drop constraint if exists couple_members_user_couple_type_unique;
-- Restore original constraint (a user can only be in ONE couple)
alter table couple_members add constraint couple_members_user_id_unique unique (user_id);

-- Drop the columns added in 0009
alter table couple_members drop column if exists couple_type;
alter table couples drop column if exists type;

-- 3. Update feature tables to support COF rooms
-- We add a nullable cof_id to all feature tables, and a check constraint to ensure
-- a row belongs to exactly one space (couple OR cof).

do $$ 
declare
  t text;
begin
  for t in select unnest(array[
    'daily_checkins', 'calendar_events', 'love_notes', 
    'health_notes', 'tasks', 'emergency_events', 'trusted_contacts'
  ])
  loop
    -- Add cof_id column
    execute format('alter table %I add column if not exists cof_id uuid references cofs(id) on delete cascade;', t);
    -- Add CHECK constraint
    execute format('alter table %I drop constraint if exists %I_space_check;', t, t);
    execute format('alter table %I add constraint %I_space_check check ((couple_id is not null and cof_id is null) or (couple_id is null and cof_id is not null));', t, t, t);
  end loop;
end $$;

-- 4. RLS Policies for cofs and cof_members
alter table cofs enable row level security;
alter table cof_members enable row level security;

create or replace function public.is_cof_member(target_cof_id uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from cof_members
    where cof_members.cof_id = target_cof_id
    and cof_members.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- cofs: members can view their own cof
create policy "cofs_select_member" on cofs
  for select using (public.is_cof_member(id));

-- cof_members: members can see the roster of their own cof
create policy "cof_members_select_member" on cof_members
  for select using (public.is_cof_member(cof_id));

-- cof_members: allow the creator of the cof to insert themselves
create policy "cof_members_insert_creator" on cof_members
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from cofs
      where cofs.id = cof_id
        and cofs.created_by = auth.uid()
    )
  );

-- 5. Update Feature Tables RLS Policies
-- We need to update existing SELECT policies on feature tables to also allow access if the user is a cof member.
-- (Currently they only check public.is_couple_member(couple_id))

drop policy if exists "checkins_select" on daily_checkins;
create policy "checkins_select" on daily_checkins
  for select using (
    (couple_id is not null and public.is_couple_member(couple_id))
    or (cof_id is not null and public.is_cof_member(cof_id))
    and (is_private = false or user_id = auth.uid())
  );

drop policy if exists "events_select" on calendar_events;
create policy "events_select" on calendar_events
  for select using (
    (couple_id is not null and public.is_couple_member(couple_id))
    or (cof_id is not null and public.is_cof_member(cof_id))
    and (is_private = false or created_by = auth.uid() or assigned_to = auth.uid())
  );

drop policy if exists "love_notes_select" on love_notes;
create policy "love_notes_select" on love_notes
  for select using (
    (couple_id is not null and public.is_couple_member(couple_id))
    or (cof_id is not null and public.is_cof_member(cof_id))
  );

drop policy if exists "health_notes_select" on health_notes;
create policy "health_notes_select" on health_notes
  for select using (
    (couple_id is not null and public.is_couple_member(couple_id))
    or (cof_id is not null and public.is_cof_member(cof_id))
    and (visible_to_partner = true or user_id = auth.uid())
  );

drop policy if exists "tasks_select" on tasks;
create policy "tasks_select" on tasks
  for select using (
    (couple_id is not null and public.is_couple_member(couple_id))
    or (cof_id is not null and public.is_cof_member(cof_id))
  );

drop policy if exists "emergency_select" on emergency_events;
create policy "emergency_select" on emergency_events
  for select using (
    (couple_id is not null and public.is_couple_member(couple_id))
    or (cof_id is not null and public.is_cof_member(cof_id))
  );

drop policy if exists "trusted_contacts_select" on trusted_contacts;
create policy "trusted_contacts_select" on trusted_contacts
  for select using (
    (couple_id is not null and public.is_couple_member(couple_id))
    or (cof_id is not null and public.is_cof_member(cof_id))
  );

-- 6. RPC for joining a COF
create or replace function public.join_cof_by_code(code text)
returns table (cof_id uuid, cof_name text) as $$
declare
  target_cof cofs%rowtype;
  member_count  int;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into target_cof from cofs where invite_code = code;

  if target_cof.id is null then
    raise exception 'INVALID_CODE';
  end if;

  if exists (select 1 from cof_members where user_id = auth.uid()) then
    raise exception 'ALREADY_PAIRED';
  end if;

  select count(*) into member_count from cof_members where cof_members.cof_id = target_cof.id;
  if member_count >= 2 then
    raise exception 'COF_FULL';
  end if;

  insert into cof_members (cof_id, user_id, role) values (target_cof.id, auth.uid(), 'partner');

  return query select target_cof.id, target_cof.name;
end;
$$ language plpgsql security definer;
