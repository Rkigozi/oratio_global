do $$
begin
  if exists ((select * from place_rollout_snapshot except select id, user_id, body, audience, created_at,
    public_expires_at, prayer_count, comment_count, edited_at from public.prayer_requests)
    union all (select id, user_id, body, audience, created_at, public_expires_at, prayer_count, comment_count,
    edited_at from public.prayer_requests except select * from place_rollout_snapshot)) then
    raise exception 'Place rollout changed prayer identity, content, audience, expiry or history';
  end if;
  if not exists (select 1 from public.prayer_requests where id = '62000000-0000-0000-0000-000000000010'
    and location_place_id = 'geonames:2643743' and location_country_code = 'GB'
    and location_lat = 51.51 and location_lng = -0.13) then
    raise exception 'Known legacy location did not reconcile to a fixed catalog centroid';
  end if;
  if not exists (select 1 from public.prayer_requests where id = '62000000-0000-0000-0000-000000000011'
    and location_city = 'Unmapped Town' and location_country = 'Unknown Country'
    and location_place_id is null and location_lat is null and location_lng is null) then
    raise exception 'Unknown legacy location text was lost or unverified coordinates survived';
  end if;
  if not exists (select 1 from public.prayer_requests where id = '62000000-0000-0000-0000-000000000012'
    and location_city = '' and location_country = '' and location_place_id is null
    and location_country_code is null and location_lat is null and location_lng is null) then
    raise exception 'Private legacy prayer retained location';
  end if;
end;
$$;
drop table place_rollout_snapshot;
delete from auth.users where id = '62000000-0000-0000-0000-000000000001';
