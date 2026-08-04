-- Add Updates entries when someone prays for a user's prayer.

alter table public.activity_events
  drop constraint if exists activity_events_event_type_check;

alter table public.activity_events
  add constraint activity_events_event_type_check
  check (
    event_type in (
      'comment_on_prayer',
      'reply_to_comment',
      'prayer_prayed',
      'prayer_circle_invite',
      'prayer_circle_accepted',
      'report_reviewed'
    )
  );

drop index if exists public.idx_activity_events_prayed_unique;
create unique index idx_activity_events_prayed_unique
  on public.activity_events(recipient_user_id, event_type, prayer_id)
  where prayer_id is not null
    and event_type = 'prayer_prayed';

create or replace function public.create_prayed_activity_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prayer_owner uuid;
  v_notify_on_prayed boolean;
begin
  select
    pr.user_id,
    coalesce((p.preferences ->> 'notify_on_prayed')::boolean, true)
  into v_prayer_owner, v_notify_on_prayed
  from public.prayer_requests pr
  left join public.profiles p on p.id = pr.user_id
  where pr.id = new.prayer_id;

  if v_prayer_owner is not null
    and v_prayer_owner <> new.user_id
    and v_notify_on_prayed then
    insert into public.activity_events (
      recipient_user_id,
      actor_user_id,
      event_type,
      prayer_id,
      metadata
    )
    values (
      v_prayer_owner,
      new.user_id,
      'prayer_prayed',
      new.prayer_id,
      jsonb_build_object(
        'actor_count', 1,
        'actor_ids', jsonb_build_array(new.user_id::text)
      )
    )
    on conflict (recipient_user_id, event_type, prayer_id)
      where prayer_id is not null
        and event_type = 'prayer_prayed'
    do update set
      actor_user_id = excluded.actor_user_id,
      metadata = jsonb_build_object(
        'actor_count',
        jsonb_array_length(
          coalesce(activity_events.metadata -> 'actor_ids', '[]'::jsonb)
          || to_jsonb(new.user_id::text)
        ),
        'actor_ids',
        coalesce(activity_events.metadata -> 'actor_ids', '[]'::jsonb)
        || to_jsonb(new.user_id::text)
      ),
      read_at = null,
      created_at = now()
    where not (
      coalesce(activity_events.metadata -> 'actor_ids', '[]'::jsonb) ? new.user_id::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists prayer_interactions_create_activity_events
  on public.prayer_interactions;
create trigger prayer_interactions_create_activity_events
after insert on public.prayer_interactions
for each row
execute function public.create_prayed_activity_events();

revoke all on function public.create_prayed_activity_events() from public;
