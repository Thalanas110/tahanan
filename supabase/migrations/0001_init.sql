-- Tahanan: initial schema
-- Run against the Supabase Postgres database. Safe to re-run (IF NOT EXISTS guards).

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username text unique,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique,
  created_by uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'partner',
  created_at timestamptz default now(),
  unique(couple_id, user_id)
);

create table if not exists daily_checkins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  mood text,
  energy_level int check (energy_level between 1 and 5),
  health_status text,
  safety_status text,
  note text,
  is_private boolean default false,
  created_at timestamptz default now()
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  created_by uuid references profiles(id) on delete cascade,
  assigned_to uuid references profiles(id),
  title text not null,
  description text,
  event_type text,
  start_time timestamptz not null,
  end_time timestamptz,
  is_private boolean default false,
  is_completed boolean default false,
  created_at timestamptz default now()
);

create table if not exists love_notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  created_by uuid references profiles(id) on delete cascade,
  recipient_id uuid references profiles(id),
  title text,
  body text not null,
  note_type text,
  open_when text,
  is_favorite boolean default false,
  created_at timestamptz default now()
);

create table if not exists health_notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  health_type text,
  severity int check (severity between 1 and 10),
  notes text,
  visible_to_partner boolean default false,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  created_by uuid references profiles(id) on delete cascade,
  assigned_to uuid references profiles(id),
  title text not null,
  description text,
  category text,
  priority text default 'normal',
  status text default 'pending',
  due_date timestamptz,
  created_at timestamptz default now()
);

create table if not exists emergency_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  triggered_by uuid references profiles(id) on delete cascade,
  status text default 'active',
  message text,
  location_note text,
  acknowledged_by uuid references profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  created_by uuid references profiles(id) on delete cascade,
  name text not null,
  relationship text,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);

-- Keep display_name/username on profiles in sync with the auth user created
-- during sign-up. The client also inserts explicitly; this trigger is a
-- fallback safety net so a profile row always exists.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enforce a couple has at most 2 members.
create or replace function public.enforce_couple_member_limit()
returns trigger as $$
begin
  if (select count(*) from couple_members where couple_id = new.couple_id) >= 2 then
    raise exception 'A couple can only have two members';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_couple_member_limit on couple_members;
create trigger trg_couple_member_limit
  before insert on couple_members
  for each row execute procedure public.enforce_couple_member_limit();
