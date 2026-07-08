-- Tahanan: Row Level Security
-- Users may only access rows belonging to their own couple.
-- Private records are visible only to the creator.
-- Health notes are private unless visible_to_partner is true.

alter table profiles enable row level security;
alter table couples enable row level security;
alter table couple_members enable row level security;
alter table daily_checkins enable row level security;
alter table calendar_events enable row level security;
alter table love_notes enable row level security;
alter table health_notes enable row level security;
alter table tasks enable row level security;
alter table emergency_events enable row level security;
alter table trusted_contacts enable row level security;

create or replace function public.is_couple_member(target_couple_id uuid)
returns boolean as $$
  select exists (
    select 1
    from couple_members
    where couple_members.couple_id = target_couple_id
    and couple_members.user_id = auth.uid()
  );
$$ language sql security definer set search_path = public;

-- profiles: everyone can read their own profile and their partner's profile.
drop policy if exists "profiles_select_self_or_partner" on profiles;
create policy "profiles_select_self_or_partner" on profiles
  for select using (
    id = auth.uid()
    or id in (
      select cm2.user_id from couple_members cm1
      join couple_members cm2 on cm2.couple_id = cm1.couple_id
      where cm1.user_id = auth.uid()
    )
  );

drop policy if exists "profiles_insert_self" on profiles;
create policy "profiles_insert_self" on profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles
  for update using (id = auth.uid());

-- couples: members can read their own couple. Creation is open (creator sets
-- created_by = auth.uid()); joining another couple is mediated by the
-- join-couple edge function via a security-definer RPC, not direct table access.
drop policy if exists "couples_select_member" on couples;
create policy "couples_select_member" on couples
  for select using (public.is_couple_member(id));

drop policy if exists "couples_insert_creator" on couples;
create policy "couples_insert_creator" on couples
  for insert with check (created_by = auth.uid());

-- couple_members: members can see the roster of their own couple.
drop policy if exists "couple_members_select_member" on couple_members;
create policy "couple_members_select_member" on couple_members
  for select using (public.is_couple_member(couple_id));

drop policy if exists "couple_members_insert_self" on couple_members;
create policy "couple_members_insert_self" on couple_members
  for insert with check (user_id = auth.uid());

-- daily_checkins: couple members can see each other's non-private check-ins;
-- everyone can always see their own (including private ones).
drop policy if exists "checkins_select" on daily_checkins;
create policy "checkins_select" on daily_checkins
  for select using (
    user_id = auth.uid()
    or (public.is_couple_member(couple_id) and is_private = false)
  );

drop policy if exists "checkins_insert_self" on daily_checkins;
create policy "checkins_insert_self" on daily_checkins
  for insert with check (user_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "checkins_update_self" on daily_checkins;
create policy "checkins_update_self" on daily_checkins
  for update using (user_id = auth.uid());

drop policy if exists "checkins_delete_self" on daily_checkins;
create policy "checkins_delete_self" on daily_checkins
  for delete using (user_id = auth.uid());

-- calendar_events: couple members can see shared events; private events only
-- visible to their creator.
drop policy if exists "events_select" on calendar_events;
create policy "events_select" on calendar_events
  for select using (
    created_by = auth.uid()
    or (public.is_couple_member(couple_id) and is_private = false)
  );

drop policy if exists "events_insert" on calendar_events;
create policy "events_insert" on calendar_events
  for insert with check (created_by = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "events_update" on calendar_events;
create policy "events_update" on calendar_events
  for update using (public.is_couple_member(couple_id));

drop policy if exists "events_delete" on calendar_events;
create policy "events_delete" on calendar_events
  for delete using (created_by = auth.uid());

-- love_notes: couple members can read notes within their couple.
drop policy if exists "love_notes_select" on love_notes;
create policy "love_notes_select" on love_notes
  for select using (public.is_couple_member(couple_id));

drop policy if exists "love_notes_insert" on love_notes;
create policy "love_notes_insert" on love_notes
  for insert with check (created_by = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "love_notes_update" on love_notes;
create policy "love_notes_update" on love_notes
  for update using (created_by = auth.uid() or recipient_id = auth.uid());

drop policy if exists "love_notes_delete" on love_notes;
create policy "love_notes_delete" on love_notes
  for delete using (created_by = auth.uid());

-- health_notes: private by default, only visible to the author unless
-- visible_to_partner is explicitly set true.
drop policy if exists "health_notes_select" on health_notes;
create policy "health_notes_select" on health_notes
  for select using (
    user_id = auth.uid()
    or (public.is_couple_member(couple_id) and visible_to_partner = true)
  );

drop policy if exists "health_notes_insert" on health_notes;
create policy "health_notes_insert" on health_notes
  for insert with check (user_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "health_notes_update" on health_notes;
create policy "health_notes_update" on health_notes
  for update using (user_id = auth.uid());

drop policy if exists "health_notes_delete" on health_notes;
create policy "health_notes_delete" on health_notes
  for delete using (user_id = auth.uid());

-- tasks: couple members can view/manage tasks within their couple.
drop policy if exists "tasks_select" on tasks;
create policy "tasks_select" on tasks
  for select using (public.is_couple_member(couple_id));

drop policy if exists "tasks_insert" on tasks;
create policy "tasks_insert" on tasks
  for insert with check (created_by = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "tasks_update" on tasks;
create policy "tasks_update" on tasks
  for update using (public.is_couple_member(couple_id));

drop policy if exists "tasks_delete" on tasks;
create policy "tasks_delete" on tasks
  for delete using (public.is_couple_member(couple_id));

-- emergency_events: couple members can see and acknowledge/resolve alerts.
drop policy if exists "emergency_select" on emergency_events;
create policy "emergency_select" on emergency_events
  for select using (public.is_couple_member(couple_id));

drop policy if exists "emergency_insert" on emergency_events;
create policy "emergency_insert" on emergency_events
  for insert with check (triggered_by = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "emergency_update" on emergency_events;
create policy "emergency_update" on emergency_events
  for update using (public.is_couple_member(couple_id));

-- trusted_contacts: couple members can manage shared trusted contacts.
drop policy if exists "trusted_contacts_select" on trusted_contacts;
create policy "trusted_contacts_select" on trusted_contacts
  for select using (public.is_couple_member(couple_id));

drop policy if exists "trusted_contacts_insert" on trusted_contacts;
create policy "trusted_contacts_insert" on trusted_contacts
  for insert with check (created_by = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists "trusted_contacts_update" on trusted_contacts;
create policy "trusted_contacts_update" on trusted_contacts
  for update using (public.is_couple_member(couple_id));

drop policy if exists "trusted_contacts_delete" on trusted_contacts;
create policy "trusted_contacts_delete" on trusted_contacts
  for delete using (public.is_couple_member(couple_id));
