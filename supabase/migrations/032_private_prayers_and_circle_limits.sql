-- V1 visibility hardening:
-- - Add private prayers that only the author can see.
-- - Keep Prayer Circle prayers non-anonymous and only usable once the author
--   has at least one accepted Circle connection.
-- - Enforce a 12-person Prayer Circle cap on invites and accepted responses.

alter table public.prayer_requests
  drop constraint if exists prayer_requests_audience_check;

alter table public.prayer_requests
  add constraint prayer_requests_audience_check
  check (audience in ('public', 'circle', 'private'));

grant update (username) on public.profiles to authenticated;

create or replace function public.prayer_circle_connection_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.prayer_circle_connections c
  where c.user_a_id = p_user_id
     or c.user_b_id = p_user_id;
$$;

revoke all on function public.prayer_circle_connection_count(uuid) from public;
grant execute on function public.prayer_circle_connection_count(uuid) to authenticated;

create or replace function public.can_view_prayer_request(
  p_prayer_id uuid,
  p_viewer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.prayer_requests pr
    where pr.id = p_prayer_id
      and (
        pr.audience = 'public'
        or pr.user_id = p_viewer_id
        or (
          pr.audience = 'circle'
          and public.users_are_in_prayer_circle(p_viewer_id, pr.user_id)
        )
      )
  );
$$;

revoke all on function public.can_view_prayer_request(uuid, uuid) from public;
grant execute on function public.can_view_prayer_request(uuid, uuid) to authenticated;

drop policy if exists "Authenticated users can view visible prayer requests"
  on public.prayer_requests;
create policy "Authenticated users can view visible prayer requests"
  on public.prayer_requests for select
  to authenticated
  using (
    audience = 'public'
    or auth.uid() = user_id
    or (
      audience = 'circle'
      and public.users_are_in_prayer_circle(auth.uid(), user_id)
    )
  );

drop policy if exists "Users can create prayer requests"
  on public.prayer_requests;
create policy "Users can create prayer requests"
  on public.prayer_requests for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and audience in ('public', 'circle', 'private')
    and (
      audience <> 'circle'
      or (
        is_anonymous = false
        and public.prayer_circle_connection_count(auth.uid()) > 0
      )
    )
    and public.check_rate_limit(auth.uid(), 'create_prayer', 10, 3600)
  );

drop policy if exists "Users can send prayer circle invites"
  on public.prayer_circle_invites;
create policy "Users can send prayer circle invites"
  on public.prayer_circle_invites for insert
  to authenticated
  with check (
    auth.uid() = requester_id
    and requester_id <> recipient_id
    and public.prayer_circle_connection_count(requester_id) < 12
    and public.prayer_circle_connection_count(recipient_id) < 12
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

  if p_status = 'accepted' then
    perform 1
    from public.profiles
    where id in (v_invite.requester_id, v_invite.recipient_id)
    order by id
    for update;

    if public.prayer_circle_connection_count(v_invite.requester_id) >= 12
      or public.prayer_circle_connection_count(v_invite.recipient_id) >= 12 then
      raise exception 'Prayer Circle limit reached';
    end if;
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

grant execute on function public.respond_to_prayer_circle_invite(uuid, text)
  to authenticated;

drop policy if exists "Users can create reports" on public.reports;
create policy "Users can create reports"
  on public.reports for insert
  to authenticated
  with check (
    auth.uid() = reported_by
    and (
      (
        reportable_type = 'prayer'
        and public.can_view_prayer_request(reportable_id, auth.uid())
      )
      or (
        reportable_type = 'comment'
        and exists (
          select 1
          from public.comments c
          where c.id = reportable_id
            and public.can_view_prayer_request(c.prayer_id, auth.uid())
        )
      )
    )
  );
