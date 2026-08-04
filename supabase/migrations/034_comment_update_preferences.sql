-- Respect the user's in-app Updates preference for comment and reply activity.

create or replace function public.create_comment_activity_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prayer_owner uuid;
  v_parent_author uuid;
  v_notify_prayer_owner boolean;
  v_notify_parent_author boolean;
begin
  select
    pr.user_id,
    coalesce((p.preferences ->> 'notify_on_comment')::boolean, true)
  into v_prayer_owner, v_notify_prayer_owner
  from public.prayer_requests pr
  left join public.profiles p on p.id = pr.user_id
  where pr.id = new.prayer_id;

  if v_prayer_owner is not null
    and v_prayer_owner <> new.user_id
    and v_notify_prayer_owner then
    insert into public.activity_events (
      recipient_user_id,
      actor_user_id,
      event_type,
      prayer_id,
      comment_id,
      metadata
    )
    values (
      v_prayer_owner,
      new.user_id,
      'comment_on_prayer',
      new.prayer_id,
      new.id,
      jsonb_build_object('comment_preview', left(new.body, 140))
    )
    on conflict do nothing;
  end if;

  if new.parent_id is not null then
    select
      c.user_id,
      coalesce((p.preferences ->> 'notify_on_comment')::boolean, true)
    into v_parent_author, v_notify_parent_author
    from public.comments c
    left join public.profiles p on p.id = c.user_id
    where c.id = new.parent_id;

    if v_parent_author is not null
      and v_parent_author <> new.user_id
      and v_parent_author is distinct from v_prayer_owner
      and v_notify_parent_author then
      insert into public.activity_events (
        recipient_user_id,
        actor_user_id,
        event_type,
        prayer_id,
        comment_id,
        metadata
      )
      values (
        v_parent_author,
        new.user_id,
        'reply_to_comment',
        new.prayer_id,
        new.id,
        jsonb_build_object('comment_preview', left(new.body, 140))
      )
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.create_comment_activity_events() from public;
