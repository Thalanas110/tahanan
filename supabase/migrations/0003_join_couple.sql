-- Security-definer RPC used by the join-couple Edge Function to look up a
-- couple by invite code (bypassing the couples_select_member RLS policy,
-- which would otherwise hide the couple from someone who isn't a member yet)
-- and add the caller as its second member. Kept in the database (not the
-- Edge Function) so the privilege escalation is auditable in one place and
-- scoped to exactly this operation.

create or replace function public.join_couple_by_code(code text)
returns table (couple_id uuid, couple_name text) as $$
declare
  target_couple couples%rowtype;
  member_count int;
begin
  select * into target_couple from couples where invite_code = code;

  if target_couple.id is null then
    raise exception 'INVALID_CODE';
  end if;

  select count(*) into member_count from couple_members where couple_members.couple_id = target_couple.id;

  if member_count >= 2 then
    raise exception 'COUPLE_FULL';
  end if;

  if exists (
    select 1 from couple_members
    where couple_members.couple_id = target_couple.id and user_id = auth.uid()
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;

  insert into couple_members (couple_id, user_id, role) values (target_couple.id, auth.uid(), 'partner');

  return query select target_couple.id, target_couple.name;
end;
$$ language plpgsql security definer set search_path = public;
