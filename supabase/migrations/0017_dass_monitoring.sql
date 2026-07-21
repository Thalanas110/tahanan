-- DASS-21 Mental Monitoring
--
-- The table contains only envelope-encrypted final score bundles. Individual
-- answers and plaintext scores must never be persisted.

create extension if not exists supabase_vault with schema vault;
create extension if not exists btree_gist;

do $$
begin
  if not exists (
    select 1
    from vault.secrets
    where name = 'dass_monitoring_kek_v1'
  ) then
    perform vault.create_secret(
      encode(gen_random_bytes(32), 'base64'),
      'dass_monitoring_kek_v1',
      'AES-256-GCM key-encryption key for DASS-21 monitoring v1'
    );
  end if;
end;
$$;

create table if not exists public.dass_monitoring_entries (
  id uuid primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  ciphertext text not null check (length(ciphertext) > 0),
  ciphertext_iv text not null check (length(ciphertext_iv) > 0),
  wrapped_data_key text not null check (length(wrapped_data_key) > 0),
  wrapped_data_key_iv text not null check (length(wrapped_data_key_iv) > 0),
  key_version text not null check (key_version = 'v1'),
  created_at timestamptz not null,
  assessment_window tstzrange not null
);

create or replace function public.set_dass_monitoring_window()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at := clock_timestamp();
  new.assessment_window := tstzrange(
    new.created_at,
    new.created_at + interval '7 days',
    '[)'
  );
  return new;
end;
$$;

drop trigger if exists set_dass_monitoring_window on public.dass_monitoring_entries;
create trigger set_dass_monitoring_window
before insert on public.dass_monitoring_entries
for each row execute procedure public.set_dass_monitoring_window();

alter table public.dass_monitoring_entries
  add constraint dass_monitoring_entries_one_per_seven_days
  exclude using gist (
    submitted_by with =,
    assessment_window with &&
  );

alter table public.dass_monitoring_entries enable row level security;
revoke all on table public.dass_monitoring_entries from anon, authenticated;
grant select, insert on table public.dass_monitoring_entries to service_role;

create or replace function public.dass_monitoring_get_kek(p_key_version text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  key_material text;
begin
  if p_key_version <> 'v1' then
    raise exception 'UNSUPPORTED_DASS_KEY_VERSION';
  end if;

  select decrypted_secret
  into key_material
  from vault.decrypted_secrets
  where name = 'dass_monitoring_kek_v1';

  if key_material is null then
    raise exception 'DASS_MONITORING_KEY_UNAVAILABLE';
  end if;

  return key_material;
end;
$$;

revoke all on function public.dass_monitoring_get_kek(text)
from public, anon, authenticated;
grant execute on function public.dass_monitoring_get_kek(text) to service_role;
