-- Add RLS policy to allow couple members to update their couple's details (like the name)
drop policy if exists "couples_update_member" on couples;
create policy "couples_update_member" on couples
  for update using (public.is_couple_member(id));
