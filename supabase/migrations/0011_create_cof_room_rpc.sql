create or replace function public.create_cof_room(room_name text)
returns public.cofs
language plpgsql
security definer
set search_path = public
as $$
declare
  created_cof public.cofs%rowtype;
  invite_code text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  attempt int;
  idx int;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if room_name is null or btrim(room_name) = '' then
    raise exception 'name is required';
  end if;

  if exists (select 1 from public.cof_members where user_id = auth.uid()) then
    raise exception 'ALREADY_PAIRED';
  end if;

  for attempt in 1..5 loop
    invite_code := '';

    for idx in 1..6 loop
      invite_code := invite_code
        || substr(alphabet, (floor(random() * length(alphabet))::int + 1), 1);
    end loop;

    exit when not exists (
      select 1
      from public.cofs
      where cofs.invite_code = invite_code
    );
  end loop;

  if exists (select 1 from public.cofs where cofs.invite_code = invite_code) then
    raise exception 'FAILED_TO_GENERATE_CODE';
  end if;

  insert into public.cofs (name, invite_code, created_by)
  values (btrim(room_name), invite_code, auth.uid())
  returning * into created_cof;

  insert into public.cof_members (cof_id, user_id, role)
  values (created_cof.id, auth.uid(), 'partner');

  return created_cof;
end;
$$;

revoke all on function public.create_cof_room(text) from public, anon;
grant execute on function public.create_cof_room(text) to authenticated;
