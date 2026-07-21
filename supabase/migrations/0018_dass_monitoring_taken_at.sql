-- DASS-21 historical assessment timestamps.
-- Existing migrations are immutable; this migration only extends 0017.

alter table public.dass_monitoring_entries
  add column taken_at timestamptz;

update public.dass_monitoring_entries
set taken_at = created_at
where taken_at is null;

alter table public.dass_monitoring_entries
  alter column taken_at set not null;

alter table public.dass_monitoring_entries
  add constraint dass_monitoring_entries_taken_at_not_after_created_at
  check (taken_at <= created_at);

create or replace function public.set_dass_monitoring_window()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at := clock_timestamp();
  new.taken_at := coalesce(new.taken_at, new.created_at);
  new.assessment_window := tstzrange(
    new.taken_at,
    new.taken_at + interval '7 days',
    '[)'
  );
  return new;
end;
$$;

update public.dass_monitoring_entries
set assessment_window = tstzrange(
  taken_at,
  taken_at + interval '7 days',
  '[)'
);
