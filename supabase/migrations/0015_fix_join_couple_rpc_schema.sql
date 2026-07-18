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
  ) then
    raise exception 'ALREADY_PAIRED';
  end if;

  select count(*) into member_count
  from couple_members
  where couple_members.couple_id = target_couple.id;

  if member_count >= 2 then
    raise exception 'COUPLE_FULL';
  end if;

  insert into couple_members (couple_id, user_id, role)
  values (target_couple.id, auth.uid(), 'partner');

  update monthsary_messages
  set recipient_id = auth.uid()
  where couple_id = target_couple.id
    and recipient_id is null
    and completed_at is null;

  return query select target_couple.id, target_couple.name;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.join_couple_by_code(text) from public, anon;
grant execute on function public.join_couple_by_code(text) to authenticated;
