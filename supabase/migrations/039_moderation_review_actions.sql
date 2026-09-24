-- Report-scoped review, reversible enforcement, and moderator-only decision notes.
-- State is separate from author-editable content so authors cannot unhide it.
create table public.moderated_content (
  reportable_type text not null check (reportable_type in ('prayer', 'comment')),
  reportable_id uuid not null,
  hidden_at timestamptz not null default now(),
  primary key (reportable_type, reportable_id)
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete set null,
  reportable_type text not null check (reportable_type in ('prayer', 'comment')),
  reportable_id uuid not null,
  action text not null check (action in ('hide', 'dismiss', 'restore')),
  note text not null check (char_length(trim(note)) between 3 and 1000),
  moderator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index moderation_actions_target_idx
  on public.moderation_actions(reportable_type, reportable_id, created_at);
alter table public.moderated_content enable row level security;
alter table public.moderation_actions enable row level security;
revoke all on public.moderated_content, public.moderation_actions from anon, authenticated;

create function public.content_is_hidden(p_type text, p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.moderated_content
    where reportable_type = p_type and reportable_id = p_id
  );
$$;

create function public.comment_is_hidden(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.comments c where c.id = p_id
    and (public.content_is_hidden('comment', c.id)
      or public.content_is_hidden('comment', c.parent_id))
  );
$$;

create or replace function public.can_view_prayer_request(p_prayer_id uuid, p_viewer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.prayer_requests pr
    where pr.id = p_prayer_id
      and not public.content_is_hidden('prayer', pr.id)
      and (pr.audience = 'public' or pr.user_id = p_viewer_id
        or (pr.audience = 'circle'
          and public.users_are_in_prayer_circle(p_viewer_id, pr.user_id)))
  );
$$;

-- Restrictive policies preserve all existing audience rules, including for owners.
create policy "Hidden prayers are not readable"
  on public.prayer_requests as restrictive for select to authenticated
  using (not public.content_is_hidden('prayer', id));
create policy "Hidden comments and replies are not readable"
  on public.comments as restrictive for select to authenticated
  using (not public.comment_is_hidden(id));
create policy "Replies require a visible parent in the same prayer"
  on public.comments as restrictive for insert to authenticated
  with check (parent_id is null or exists (
    select 1 from public.comments parent
    where parent.id = comments.parent_id and parent.prayer_id = comments.prayer_id
      and parent.parent_id is null
  ));
create policy "Hidden activity previews are not readable"
  on public.activity_events as restrictive for select to authenticated
  using (
    (prayer_id is null or public.can_view_prayer_request(prayer_id, auth.uid()))
    and (comment_id is null or not public.comment_is_hidden(comment_id))
  );

-- Count visible comments, including after restoring or deleting a hidden thread.
create function public.refresh_visible_comment_count(p_prayer_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.prayer_requests set comment_count = (
    select count(*)::integer from public.comments c
    where c.prayer_id = p_prayer_id and not public.comment_is_hidden(c.id)
  ) where id = p_prayer_id;
$$;
create or replace function public.increment_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_visible_comment_count(new.prayer_id);
  return new;
end;
$$;
create or replace function public.decrement_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_visible_comment_count(old.prayer_id);
  return old;
end;
$$;

-- No blanket moderator SELECT policy on prayers or comments. This function only
-- returns the reported target and its parent prayer, never owner-only Private data.
create function public.get_report_review(p_report_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_report public.reports%rowtype;
  v_prayer public.prayer_requests%rowtype;
  v_comment public.comments%rowtype;
  v_author public.profiles%rowtype;
  v_parent_body text;
  v_actions jsonb;
  v_body text;
  v_created_at timestamptz;
begin
  if not public.current_user_is_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  select * into v_report from public.reports where id = p_report_id;
  if not found then raise exception 'Report not found' using errcode = 'P0002'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'action', a.action, 'note', a.note, 'created_at', a.created_at,
    'moderator', coalesce(p.display_name, p.username, 'Former moderator')
  ) order by a.created_at desc, a.id), '[]'::jsonb) into v_actions
  from public.moderation_actions a left join public.profiles p on p.id = a.moderator_id
  where a.reportable_type = v_report.reportable_type and a.reportable_id = v_report.reportable_id;

  if v_report.reportable_type = 'comment' then
    select * into v_comment from public.comments where id = v_report.reportable_id;
    select * into v_prayer from public.prayer_requests where id = v_comment.prayer_id;
    select * into v_author from public.profiles where id = v_comment.user_id;
    v_body := v_comment.body;
    v_created_at := v_comment.created_at;
    select body into v_parent_body from public.comments
      where id = v_comment.parent_id and prayer_id = v_comment.prayer_id;
  else
    select * into v_prayer from public.prayer_requests where id = v_report.reportable_id;
    if not v_prayer.is_anonymous then
      select * into v_author from public.profiles where id = v_prayer.user_id;
    end if;
    v_body := v_prayer.body;
    v_created_at := v_prayer.created_at;
  end if;

  if v_prayer.id is null or v_prayer.audience = 'private' or v_body is null then
    return jsonb_build_object('status', v_report.status, 'available', false, 'hidden', false, 'version', null,
      'target', null, 'prayer', null, 'parent_comment', null, 'actions', v_actions);
  end if;
  return jsonb_build_object(
    'status', v_report.status,
    'available', true,
    'hidden', public.content_is_hidden(v_report.reportable_type, v_report.reportable_id),
    'version', md5(jsonb_build_array(v_body, v_prayer.body, v_prayer.audience, v_parent_body)::text),
    'target', jsonb_build_object('body', v_body, 'created_at', v_created_at,
      'author', coalesce(v_author.display_name, v_author.username, 'Anonymous')),
    'prayer', jsonb_build_object('body', v_prayer.body, 'audience', v_prayer.audience),
    'parent_comment', v_parent_body,
    'actions', v_actions
  );
end;
$$;

create function public.moderate_report(
  p_report_id uuid, p_action text, p_note text, p_expected_version text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_report public.reports%rowtype;
  v_context jsonb;
  v_prayer_id uuid;
begin
  if not public.current_user_is_moderator() then
    raise exception 'Moderator access required' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('hide', 'dismiss', 'restore') then
    raise exception 'Invalid moderation action' using errcode = '22023';
  end if;
  if p_note is null or char_length(trim(p_note)) not between 3 and 1000 then
    raise exception 'A decision reason between 3 and 1000 characters is required' using errcode = '22023';
  end if;
  select * into v_report from public.reports where id = p_report_id;
  if not found then raise exception 'Report not found' using errcode = 'P0002'; end if;

  -- Serialize all decisions for the same target, including reports by other users.
  perform pg_advisory_xact_lock(hashtextextended(v_report.reportable_type || v_report.reportable_id::text, 0));
  select * into v_report from public.reports where id = p_report_id for update;
  if not found then raise exception 'Report not found' using errcode = 'P0002'; end if;
  if p_action <> 'restore' and v_report.status <> 'pending' then
    raise exception 'Report already reviewed; refresh the queue' using errcode = '40001';
  end if;

  if v_report.reportable_type = 'prayer' then
    v_prayer_id := v_report.reportable_id;
  else
    select prayer_id into v_prayer_id from public.comments where id = v_report.reportable_id;
  end if;
  -- Prevent audience or body edits between review validation and enforcement.
  perform 1 from public.prayer_requests where id = v_prayer_id for update;
  if v_report.reportable_type = 'comment' then
    perform 1 from public.comments where id = v_report.reportable_id
      or id = (select parent_id from public.comments where id = v_report.reportable_id)
      order by id for update;
  end if;
  v_context := public.get_report_review(p_report_id);
  if (v_context ->> 'version') is distinct from p_expected_version then
    raise exception 'Content changed; refresh the review before deciding' using errcode = '40001';
  end if;
  if p_action in ('hide', 'restore') and not (v_context ->> 'available')::boolean then
    raise exception 'Content is unavailable or private' using errcode = '42501';
  end if;

  if p_action = 'hide' then
    if (v_context ->> 'hidden')::boolean then
      raise exception 'Content already hidden; refresh the review' using errcode = '40001';
    end if;
    insert into public.moderated_content(reportable_type, reportable_id)
      values (v_report.reportable_type, v_report.reportable_id);
    -- Close related pending reports only once enforcement has succeeded.
    update public.reports set status = 'resolved', resolved_at = now(),
      resolved_by = auth.uid(), moderator_note = null
    where reportable_type = v_report.reportable_type and reportable_id = v_report.reportable_id
      and status = 'pending';
  elsif p_action = 'restore' then
    delete from public.moderated_content
      where reportable_type = v_report.reportable_type and reportable_id = v_report.reportable_id;
    if not found then
      raise exception 'Content is not hidden; refresh the review' using errcode = '40001';
    end if;
  else
    update public.reports set status = 'dismissed', resolved_at = now(),
      resolved_by = auth.uid(), moderator_note = null where id = p_report_id;
  end if;

  insert into public.moderation_actions(report_id, reportable_type, reportable_id, action, note, moderator_id)
    values (p_report_id, v_report.reportable_type, v_report.reportable_id, p_action, trim(p_note), auth.uid());
  if v_report.reportable_type = 'comment' and p_action <> 'dismiss' then
    perform public.refresh_visible_comment_count(v_prayer_id);
  end if;
end;
$$;

-- Decisions cannot be forged or edited through the ordinary REST table API.
revoke update on public.reports from authenticated;
revoke update (status, resolved_at, resolved_by, moderator_note, updated_at)
  on public.reports from authenticated;
revoke insert on public.reports from authenticated;
grant insert (reportable_type, reportable_id, reported_by, reason) on public.reports to authenticated;

revoke all on function public.content_is_hidden(text, uuid) from public, anon;
revoke all on function public.comment_is_hidden(uuid) from public, anon;
revoke all on function public.refresh_visible_comment_count(uuid) from public, anon, authenticated;
revoke all on function public.increment_comment_count() from public, anon, authenticated;
revoke all on function public.decrement_comment_count() from public, anon, authenticated;
revoke all on function public.get_report_review(uuid) from public, anon;
revoke all on function public.moderate_report(uuid, text, text, text) from public, anon;
grant execute on function public.content_is_hidden(text, uuid) to authenticated;
grant execute on function public.comment_is_hidden(uuid) to authenticated;
grant execute on function public.get_report_review(uuid) to authenticated;
grant execute on function public.moderate_report(uuid, text, text, text) to authenticated;
