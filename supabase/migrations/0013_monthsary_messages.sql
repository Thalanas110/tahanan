alter table couples
  add column if not exists relationship_start_date date;

create table if not exists monthsary_messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  title text,
  body text not null,
  target_monthsary_date date not null,
  completed_at timestamptz,
  created_at timestamptz default now(),
  check (recipient_id <> created_by)
);

create unique index if not exists monthsary_messages_pending_unique
  on monthsary_messages (couple_id, recipient_id, target_monthsary_date)
  where completed_at is null;

create index if not exists monthsary_messages_due_recipient_idx
  on monthsary_messages (recipient_id, target_monthsary_date)
  where completed_at is null;

alter table monthsary_messages enable row level security;

drop policy if exists "monthsary_messages_select_member" on monthsary_messages;
create policy "monthsary_messages_select_member" on monthsary_messages
  for select using (public.is_couple_member(couple_id));

drop policy if exists "monthsary_messages_insert_member" on monthsary_messages;
create policy "monthsary_messages_insert_member" on monthsary_messages
  for insert with check (
    created_by = auth.uid()
    and public.is_couple_member(couple_id)
    and exists (
      select 1
      from couple_members
      where couple_members.couple_id = monthsary_messages.couple_id
        and couple_members.user_id = monthsary_messages.recipient_id
    )
  );

drop policy if exists "monthsary_messages_update_creator" on monthsary_messages;
create policy "monthsary_messages_update_creator" on monthsary_messages
  for update using (
    created_by = auth.uid()
    and public.is_couple_member(couple_id)
    and completed_at is null
  )
  with check (
    created_by = auth.uid()
    and public.is_couple_member(couple_id)
    and completed_at is null
  );

drop policy if exists "monthsary_messages_update_recipient" on monthsary_messages;
create policy "monthsary_messages_update_recipient" on monthsary_messages
  for update using (
    recipient_id = auth.uid()
    and public.is_couple_member(couple_id)
    and completed_at is null
  )
  with check (
    recipient_id = auth.uid()
    and public.is_couple_member(couple_id)
  );
