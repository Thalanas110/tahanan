-- Tahanan: COF (Close/Couple of Friends) room support
--
-- Allows each user to belong to up to two couples simultaneously:
--   • one 'partner' couple  (the original bf/gf space)
--   • one 'cof'     couple  (a Close/Couple of Friends space)
--
-- Changes:
--   1. Add `type` column (default 'partner') to `couples`.
--   2. Add `couple_type` column to `couple_members` (denormalised from couples,
--      populated at insert so we can index it simply).
--   3. Drop the old global unique constraint `couple_members_user_id_unique`
--      (allowed only one couple per user across all types).
--   4. Add a new unique constraint on (user_id, couple_type) so a user can
--      be in at most one couple of each type.
--   5. Update `couple_members_insert_creator` RLS insert policy to also
--      require the couple type matches.
--   6. Replace `join_couple_by_code` RPC with a type-aware version.

-- ── 1. Add type to couples ────────────────────────────────────────────────────
alter table couples
  add column if not exists type text not null default 'partner'
    check (type in ('partner', 'cof'));

-- ── 2. Add couple_type to couple_members (denormalised) ──────────────────────
alter table couple_members
  add column if not exists couple_type text not null default 'partner'
    check (couple_type in ('partner', 'cof'));

-- Backfill existing rows from the couples table.
update couple_members cm
set    couple_type = c.type
from   couples c
where  cm.couple_id = c.id;

-- ── 3. Drop old global unique constraint ─────────────────────────────────────
alter table couple_members
  drop constraint if exists couple_members_user_id_unique;

-- ── 4. New per-type unique constraint ────────────────────────────────────────
-- Ensures a user can be in at most one couple of each type.
alter table couple_members
  add constraint couple_members_user_couple_type_unique unique (user_id, couple_type);

-- ── 5. Update insert RLS policy ───────────────────────────────────────────────
-- The original policy only let the couple creator insert themselves.
-- This recreation is identical in logic; it now also benefits from the new
-- (user_id, couple_type) uniqueness that Postgres enforces automatically.
drop policy if exists "couple_members_insert_creator" on couple_members;
create policy "couple_members_insert_creator" on couple_members
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from couples
      where couples.id = couple_id
        and couples.created_by = auth.uid()
    )
  );

-- ── 6. Type-aware join RPC ────────────────────────────────────────────────────
create or replace function public.join_couple_by_code(code text)
returns table (couple_id uuid, couple_name text) as $$
declare
  target_couple couples%rowtype;
  member_count  int;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into target_couple from couples where invite_code = code;

  if target_couple.id is null then
    raise exception 'INVALID_CODE';
  end if;

  -- Block if the caller is already in a couple of THIS type.
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

  return query select target_couple.id, target_couple.name;
end;
$$ language plpgsql security definer set search_path = public;

-- Keep execution locked to authenticated users only.
revoke all on function public.join_couple_by_code(text) from public, anon;
grant execute on function public.join_couple_by_code(text) to authenticated;
