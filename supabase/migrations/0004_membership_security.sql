-- Tahanan: harden couple membership security (code review fixes)
--
-- Issues fixed:
-- 1. couple_members_insert_self allowed any authenticated user to insert
--    themselves into ANY couple_id via a direct REST call, bypassing the
--    invite-code flow entirely. Replaced with a policy that only allows
--    self-insertion into a couple the caller created (the create-couple
--    flow); joining an existing couple must go through join_couple_by_code.
-- 2. join_couple_by_code did not guard against a null auth.uid() (e.g. if
--    ever invoked outside a normal authenticated request context) and did
--    not stop a user who is already paired from joining a second couple.
-- 3. Nothing enforced "one couple per person" at the data layer -- add a
--    unique constraint on couple_members.user_id.

-- 1. One couple per person, enforced at the database level.
alter table couple_members add constraint couple_members_user_id_unique unique (user_id);

-- 2. Replace the overly-permissive insert policy.
drop policy if exists "couple_members_insert_self" on couple_members;
create policy "couple_members_insert_creator" on couple_members
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from couples
      where couples.id = couple_id
      and couples.created_by = auth.uid()
    )
  );

-- 3. Harden the join RPC: require an authenticated caller and reject callers
-- who are already paired with someone (couple_members_user_id_unique above
-- would also catch this at insert time, but we want a clean error message
-- instead of a raw constraint violation).
create or replace function public.join_couple_by_code(code text)
returns table (couple_id uuid, couple_name text) as $$
declare
  target_couple couples%rowtype;
  member_count int;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if exists (select 1 from couple_members where user_id = auth.uid()) then
    raise exception 'ALREADY_PAIRED';
  end if;

  select * into target_couple from couples where invite_code = code;

  if target_couple.id is null then
    raise exception 'INVALID_CODE';
  end if;

  select count(*) into member_count from couple_members where couple_members.couple_id = target_couple.id;

  if member_count >= 2 then
    raise exception 'COUPLE_FULL';
  end if;

  insert into couple_members (couple_id, user_id, role) values (target_couple.id, auth.uid(), 'partner');

  return query select target_couple.id, target_couple.name;
end;
$$ language plpgsql security definer set search_path = public;

-- Lock down execution to authenticated users only (Supabase grants EXECUTE
-- broadly by default on newly created functions).
revoke all on function public.join_couple_by_code(text) from public, anon;
grant execute on function public.join_couple_by_code(text) to authenticated;
