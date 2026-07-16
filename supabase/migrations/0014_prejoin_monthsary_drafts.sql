alter table monthsary_messages
  alter column recipient_id drop not null;

drop index if exists monthsary_messages_pending_unique;
create unique index if not exists monthsary_messages_pending_unique
  on monthsary_messages (couple_id)
  where completed_at is null;

drop policy if exists "monthsary_messages_insert_member" on monthsary_messages;
create policy "monthsary_messages_insert_member" on monthsary_messages
  for insert with check (
    created_by = auth.uid()
    and public.is_couple_member(couple_id)
    and (
      recipient_id is null
      or exists (
        select 1
        from couple_members
        where couple_members.couple_id = monthsary_messages.couple_id
          and couple_members.user_id = monthsary_messages.recipient_id
      )
    )
  );

create or replace function public.join_couple_by_code(code text)
returns table (couple_id uuid, couple_name text) as $$
declare
  target_couple couples%rowtype;
  member_count int;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into target_couple from couples where invite_code = code;

  if target_couple.id is null then
    raise exception 'INVALID_CODE';
  end if;

  if exists (
    select 1 from couple_members
    where user_id = auth.uid()
      and couple_type = target_couple.type
  ) then
    raise exception 'ALREADY_PAIRED';
  end if;

  select count(*) into member_count
  from couple_members
  where couple_members.couple_id = target_couple.id;

  if member_count >= 2 then
    raise exception 'COUPLE_FULL';
  end if;

  insert into couple_members (couple_id, user_id, role, couple_type)
  values (target_couple.id, auth.uid(), 'partner', target_couple.type);

  update monthsary_messages
  set recipient_id = auth.uid()
  where couple_id = target_couple.id
    and recipient_id is null
    and completed_at is null;

  return query select target_couple.id, target_couple.name;
end;
$$ language plpgsql security definer set search_path = public;
