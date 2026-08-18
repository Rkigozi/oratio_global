-- Keep username changes from breaking profile links or allowing impersonation.

create table if not exists public.profile_username_aliases (
  username text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profile_username_aliases enable row level security;

revoke all on table public.profile_username_aliases from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from public.profiles
    group by lower(trim(username))
    having count(*) > 1
  ) then
    raise exception 'Cannot reserve usernames because case-insensitive duplicates exist';
  end if;
end;
$$;

update public.profiles
set username = lower(trim(username))
where username <> lower(trim(username));

insert into public.profile_username_aliases (username, profile_id)
select username, id
from public.profiles
on conflict (username) do nothing;

create or replace function public.protect_profile_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  new.username := lower(trim(new.username));

  select alias.profile_id
  into v_owner
  from public.profile_username_aliases alias
  where alias.username = new.username;

  if v_owner is not null and v_owner <> new.id then
    raise unique_violation using message = 'Username is already reserved';
  end if;

  if tg_op = 'UPDATE' and new.username is distinct from old.username then
    insert into public.profile_username_aliases (username, profile_id)
    values (new.username, new.id)
    on conflict (username) do nothing;

    select alias.profile_id
    into v_owner
    from public.profile_username_aliases alias
    where alias.username = new.username;

    if v_owner <> new.id then
      raise unique_violation using message = 'Username is already reserved';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.register_profile_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_username_aliases (username, profile_id)
  values (new.username, new.id)
  on conflict (username) do nothing;

  if not exists (
    select 1
    from public.profile_username_aliases alias
    where alias.username = new.username
      and alias.profile_id = new.id
  ) then
    raise unique_violation using message = 'Username is already reserved';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_username on public.profiles;
create trigger trg_protect_profile_username
  before insert or update of username on public.profiles
  for each row execute function public.protect_profile_username();

drop trigger if exists trg_register_profile_username on public.profiles;
create trigger trg_register_profile_username
  after insert on public.profiles
  for each row execute function public.register_profile_username();

create or replace function public.resolve_profile_by_username(p_username text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profile.id,
    profile.username,
    profile.display_name,
    profile.avatar_url,
    profile.created_at
  from public.profile_username_aliases alias
  join public.profiles profile on profile.id = alias.profile_id
  where alias.username = lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.resolve_profile_by_username(text) from public, anon;
grant execute on function public.resolve_profile_by_username(text) to authenticated;
