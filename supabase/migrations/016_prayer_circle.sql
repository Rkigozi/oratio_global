-- Mutual, consent-based Prayer Circle relationships.
-- This replaces one-way follows in the product experience without migrating
-- old follows into circles automatically.

create table if not exists public.prayer_circle_invites (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);

create index if not exists idx_prayer_circle_invites_requester
  on public.prayer_circle_invites(requester_id);

create index if not exists idx_prayer_circle_invites_recipient
  on public.prayer_circle_invites(recipient_id);

create unique index if not exists idx_prayer_circle_invites_pending_pair
  on public.prayer_circle_invites (
    least(requester_id, recipient_id),
    greatest(requester_id, recipient_id)
  )
  where status = 'pending';

create table if not exists public.prayer_circle_connections (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  accepted_invite_id uuid references public.prayer_circle_invites(id) on delete set null,
  created_at timestamptz not null default now(),
  check (user_a_id <> user_b_id)
);

create unique index if not exists idx_prayer_circle_connections_pair
  on public.prayer_circle_connections (
    least(user_a_id, user_b_id),
    greatest(user_a_id, user_b_id)
  );

create index if not exists idx_prayer_circle_connections_user_a
  on public.prayer_circle_connections(user_a_id);

create index if not exists idx_prayer_circle_connections_user_b
  on public.prayer_circle_connections(user_b_id);

alter table public.prayer_circle_invites enable row level security;
alter table public.prayer_circle_connections enable row level security;

create trigger trg_prayer_circle_invites_updated_at
  before update on public.prayer_circle_invites
  for each row execute function public.update_updated_at();

drop policy if exists "Users can view their prayer circle invites"
  on public.prayer_circle_invites;
create policy "Users can view their prayer circle invites"
  on public.prayer_circle_invites for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "Users can send prayer circle invites"
  on public.prayer_circle_invites;
create policy "Users can send prayer circle invites"
  on public.prayer_circle_invites for insert
  to authenticated
  with check (
    auth.uid() = requester_id
    and requester_id <> recipient_id
    and not exists (
      select 1
      from public.prayer_circle_connections c
      where (
        c.user_a_id = requester_id
        and c.user_b_id = recipient_id
      )
      or (
        c.user_a_id = recipient_id
        and c.user_b_id = requester_id
      )
    )
  );

drop policy if exists "Users can view their prayer circle connections"
  on public.prayer_circle_connections;
create policy "Users can view their prayer circle connections"
  on public.prayer_circle_connections for select
  to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

drop policy if exists "Users can remove their prayer circle connections"
  on public.prayer_circle_connections;
create policy "Users can remove their prayer circle connections"
  on public.prayer_circle_connections for delete
  to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create or replace function public.respond_to_prayer_circle_invite(
  p_invite_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.prayer_circle_invites%rowtype;
begin
  if p_status not in ('accepted', 'declined') then
    raise exception 'Invalid prayer circle response';
  end if;

  select *
  into v_invite
  from public.prayer_circle_invites
  where id = p_invite_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Prayer circle invite is not pending';
  end if;

  if auth.uid() <> v_invite.recipient_id then
    raise exception 'Only the recipient can respond to this invite';
  end if;

  update public.prayer_circle_invites
  set status = p_status,
      responded_at = now()
  where id = p_invite_id;

  if p_status = 'accepted' then
    insert into public.prayer_circle_connections (
      user_a_id,
      user_b_id,
      accepted_invite_id
    )
    values (
      v_invite.requester_id,
      v_invite.recipient_id,
      p_invite_id
    )
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.cancel_prayer_circle_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.prayer_circle_invites%rowtype;
begin
  select *
  into v_invite
  from public.prayer_circle_invites
  where id = p_invite_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Prayer circle invite is not pending';
  end if;

  if auth.uid() <> v_invite.requester_id then
    raise exception 'Only the requester can cancel this invite';
  end if;

  update public.prayer_circle_invites
  set status = 'cancelled',
      responded_at = now()
  where id = p_invite_id;
end;
$$;

grant execute on function public.respond_to_prayer_circle_invite(uuid, text)
  to authenticated;

grant execute on function public.cancel_prayer_circle_invite(uuid)
  to authenticated;
