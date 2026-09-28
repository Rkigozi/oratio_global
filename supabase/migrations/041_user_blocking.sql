-- Personal safety blocks are owned by the blocker. They do not grant moderator
-- access, delete content, or notify the other account.
create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks(blocked_id, blocker_id);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon, authenticated;
grant select on public.user_blocks to authenticated;
create policy "Users can read only their own blocks" on public.user_blocks
  for select to authenticated using (blocker_id = auth.uid());

-- Only checks the caller's relationship, never arbitrary pairs of other users.
create function public.account_is_blocked(p_other_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_other_id)
       or (b.blocked_id = auth.uid() and b.blocker_id = p_other_id));
$$;

create function public.block_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to block an account' using errcode = '42501';
  end if;
  if p_user_id is null or p_user_id = auth.uid() then
    raise exception 'Choose another account' using errcode = '22023';
  end if;
  -- Match the Circle write lock order so an accept cannot recreate a connection.
  perform 1 from public.profiles where id in (auth.uid(), p_user_id) order by id for update;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Account unavailable' using errcode = 'P0002';
  end if;
  insert into public.user_blocks(blocker_id, blocked_id) values (auth.uid(), p_user_id)
    on conflict do nothing;
  update public.prayer_circle_invites set status = 'cancelled', responded_at = now()
    where status = 'pending' and
      ((requester_id = auth.uid() and recipient_id = p_user_id)
        or (recipient_id = auth.uid() and requester_id = p_user_id));
  delete from public.prayer_circle_connections
    where (user_a_id = auth.uid() and user_b_id = p_user_id)
       or (user_b_id = auth.uid() and user_a_id = p_user_id);
  delete from public.follows
    where (follower_id = auth.uid() and following_id = p_user_id)
       or (following_id = auth.uid() and follower_id = p_user_id);
end;
$$;

create function public.unblock_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to manage blocked accounts' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id in (auth.uid(), p_user_id) order by id for update;
  delete from public.user_blocks where blocker_id = auth.uid() and blocked_id = p_user_id;
  -- Deliberately do not restore invites, follows or Circle membership.
end;
$$;

create function public.get_blocked_accounts(p_limit integer default 50, p_offset integer default 0)
returns table (id uuid, username text, display_name text, avatar_url text, blocked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar_url, b.created_at
  from public.user_blocks b join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc, b.blocked_id
  limit greatest(1, least(coalesce(p_limit, 50), 50)) offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.can_view_prayer_request(p_prayer_id uuid, p_viewer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_viewer_id = auth.uid() and exists (
    select 1 from public.prayer_requests pr where pr.id = p_prayer_id
      and not public.content_is_hidden('prayer', pr.id)
      and not public.account_is_blocked(pr.user_id)
      and (pr.audience = 'public' or pr.user_id = p_viewer_id
        or (pr.audience = 'circle' and public.users_are_in_prayer_circle(p_viewer_id, pr.user_id)))
  );
$$;

create function public.comment_author_is_blocked(p_comment_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.comments c
    left join public.comments parent on parent.id = c.parent_id
    where c.id = p_comment_id
      and (public.account_is_blocked(c.user_id) or public.account_is_blocked(parent.user_id)));
$$;

create policy "Blocked accounts cannot read each other's prayers"
  on public.prayer_requests as restrictive for select to authenticated
  using (not public.account_is_blocked(user_id));
create policy "Blocked accounts cannot read each other's profiles"
  on public.profiles as restrictive for select to authenticated
  using (not public.account_is_blocked(id));
create policy "Blocked comments and their replies are not readable"
  on public.comments as restrictive for select to authenticated
  using (not public.comment_author_is_blocked(id));
create policy "Blocked accounts cannot edit hidden comment threads"
  on public.comments as restrictive for update to authenticated
  using (public.can_view_prayer_request(prayer_id, auth.uid()) and not public.comment_author_is_blocked(id));
create policy "Blocked actors are not visible in interactions"
  on public.prayer_interactions as restrictive for select to authenticated
  using (not public.account_is_blocked(user_id));
create policy "Saved prayers still require access"
  on public.saved_prayers as restrictive for select to authenticated
  using (public.can_view_prayer_request(prayer_id, auth.uid()));
create policy "Blocked activity is not readable"
  on public.activity_events as restrictive for select to authenticated
  using ((event_type = 'report_reviewed' or not public.account_is_blocked(actor_user_id))
    and (comment_id is null or not public.comment_author_is_blocked(comment_id)));
create policy "Blocked Circle invites are not readable"
  on public.prayer_circle_invites as restrictive for select to authenticated
  using (not public.account_is_blocked(requester_id) and not public.account_is_blocked(recipient_id));
create policy "Blocked accounts cannot follow each other"
  on public.follows as restrictive for insert to authenticated
  with check (not public.account_is_blocked(following_id));

-- Username aliases must obey the same profile access rules as direct reads.
create or replace function public.resolve_profile_by_username(p_username text)
returns table (id uuid, username text, display_name text, avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.created_at
  from public.profile_username_aliases a join public.profiles p on p.id = a.profile_id
  where a.username = lower(trim(p_username)) and not public.account_is_blocked(p.id)
  limit 1;
$$;

-- Serialize relationship writes with blocks, including definer RPCs and legacy follows.
create function public.guard_blocked_account_pair()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_a uuid; v_b uuid;
begin
  if tg_table_name = 'prayer_circle_invites' then
    if new.status not in ('pending', 'accepted') then return new; end if;
    v_a := new.requester_id; v_b := new.recipient_id;
  elsif tg_table_name = 'follows' then
    v_a := new.follower_id; v_b := new.following_id;
  else
    v_a := new.user_a_id; v_b := new.user_b_id;
  end if;
  perform 1 from public.profiles where id in (v_a, v_b) order by id for update;
  if exists (select 1 from public.user_blocks b
    where (b.blocker_id = v_a and b.blocked_id = v_b)
       or (b.blocker_id = v_b and b.blocked_id = v_a)) then
    raise exception 'This connection is unavailable' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger guard_blocked_circle_invite before insert or update on public.prayer_circle_invites
  for each row execute function public.guard_blocked_account_pair();
create trigger guard_blocked_circle_connection before insert or update on public.prayer_circle_connections
  for each row execute function public.guard_blocked_account_pair();
create trigger guard_blocked_follow before insert or update on public.follows
  for each row execute function public.guard_blocked_account_pair();

create or replace function public.respond_to_prayer_circle_invite(p_invite_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_invite public.prayer_circle_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('accepted', 'declined') then
    raise exception 'Invalid prayer circle response' using errcode = '22023';
  end if;
  select * into v_invite from public.prayer_circle_invites where id = p_invite_id;
  if not found or auth.uid() <> v_invite.recipient_id then
    raise exception 'Invite unavailable' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id in (v_invite.requester_id, v_invite.recipient_id)
    order by id for update;
  select * into v_invite from public.prayer_circle_invites where id = p_invite_id for update;
  if not found or v_invite.status <> 'pending' then
    raise exception 'Prayer circle invite is not pending' using errcode = '40001';
  end if;
  if public.account_is_blocked(v_invite.requester_id) then
    raise exception 'This connection is unavailable' using errcode = '42501';
  end if;
  if p_status = 'accepted' and (public.prayer_circle_connection_count(v_invite.requester_id) >= 12
    or public.prayer_circle_connection_count(v_invite.recipient_id) >= 12) then
    raise exception 'Prayer Circle limit reached' using errcode = '23514';
  end if;
  update public.prayer_circle_invites set status = p_status, responded_at = now() where id = p_invite_id;
  if p_status = 'accepted' then
    insert into public.prayer_circle_connections(user_a_id, user_b_id, accepted_invite_id)
    values (v_invite.requester_id, v_invite.recipient_id, p_invite_id) on conflict do nothing;
  end if;
end;
$$;

-- NULL auth must never pass the legacy requester's identity check.
create or replace function public.cancel_prayer_circle_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_invite public.prayer_circle_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into v_invite from public.prayer_circle_invites
    where id = p_invite_id and requester_id = auth.uid() for update;
  if not found then raise exception 'Invite unavailable' using errcode = '42501'; end if;
  if v_invite.status <> 'pending' then
    raise exception 'Prayer circle invite is not pending' using errcode = '40001';
  end if;
  update public.prayer_circle_invites set status = 'cancelled', responded_at = now()
    where id = p_invite_id;
end;
$$;

revoke all on function public.account_is_blocked(uuid), public.comment_author_is_blocked(uuid),
  public.block_user(uuid), public.unblock_user(uuid), public.get_blocked_accounts(integer, integer)
  from public, anon;
revoke all on function public.guard_blocked_account_pair() from public, anon, authenticated;
revoke all on function public.respond_to_prayer_circle_invite(uuid, text) from public, anon;
revoke all on function public.cancel_prayer_circle_invite(uuid) from public, anon;
grant execute on function public.account_is_blocked(uuid), public.comment_author_is_blocked(uuid),
  public.block_user(uuid), public.unblock_user(uuid), public.get_blocked_accounts(integer, integer)
  to authenticated;
