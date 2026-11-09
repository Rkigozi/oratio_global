\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', message; end if; end;
$$;
create function pg_temp.page_id(n integer) returns uuid language sql immutable as $$
  select ('71000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;
insert into auth.users(id, email, raw_user_meta_data)
select pg_temp.page_id(n), 'paging-' || n || '@example.com',
  jsonb_build_object('username', 'paging_' || n) from generate_series(9001,9003) n;

-- Only disposable fixtures bypass insert throttling. Reads below use real RLS.
insert into public.prayer_requests(id, user_id, body, audience, location_place_id, created_at)
select pg_temp.page_id(n), pg_temp.page_id(case when n = 60 then 9003 else 9001 end),
  'Local paging fixture ' || n,
  case when n = 56 then 'circle' when n = 57 then 'private' else 'public' end,
  case when n > 60 then 'geonames:2988507' else 'geonames:2643743' end,
  '2026-10-20T12:00:00.123456Z'::timestamptz - case when n = 1 then interval '1 microsecond' else interval '0' end
from generate_series(1,2060) n;
update public.prayer_requests set public_expires_at = now() where id = pg_temp.page_id(58);
insert into public.moderated_content(reportable_type, reportable_id) values ('prayer', pg_temp.page_id(59));
analyze public.prayer_requests;
analyze public.profiles;

set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', pg_temp.page_id(9002)::text, false);
select public.block_user(pg_temp.page_id(9003));

create temp view matching_location_prayers as
  select pr.* from public.prayer_requests pr join public.profiles p on p.id = pr.user_id
  where pr.audience = 'public' and pr.location_place_id = 'geonames:2643743'
    and pr.public_expires_at > now();
select pg_temp.assert_true((select count(*) = 55 from matching_location_prayers),
  'Total counts all matching active rows, excluding other places, Circle, Private, expired, hidden and blocked');
create temp table first_location_page as
  select id, created_at from matching_location_prayers order by created_at desc, id desc limit 50;
select pg_temp.assert_true((select count(*) = 50 from first_location_page), 'First page does not substitute loaded count for total');
select pg_temp.assert_true((select id = pg_temp.page_id(6) from first_location_page order by created_at, id limit 1),
  'UUID tie-break makes the last included row deterministic');
select pg_temp.assert_true((select count(*) = 51 from
  (select id from matching_location_prayers order by created_at desc, id desc limit 51) lookahead),
  'Lookahead identifies an additional page without treating the extra row as loaded');

reset role;
insert into public.prayer_requests(id, user_id, body, audience, location_place_id, created_at)
values (pg_temp.page_id(3000), pg_temp.page_id(9001), 'New prayer during paging', 'public', 'geonames:2643743', now());
set role authenticated;
create temp table next_location_page as
  select id, created_at from matching_location_prayers
  where created_at < '2026-10-20T12:00:00.123456Z'
    or (created_at = '2026-10-20T12:00:00.123456Z' and id < pg_temp.page_id(6))
  order by created_at desc, id desc limit 51;
select pg_temp.assert_true((select count(*) = 5 from next_location_page), 'Tied timestamps do not skip older rows after a concurrent insertion');
select pg_temp.assert_true((select count(*) = 0 from first_location_page f join next_location_page n using(id)),
  'Cursor pages do not overlap');
select pg_temp.assert_true((select count(distinct id) = 55 from
  (select id from first_location_page union all select id from next_location_page) pages),
  'More than 50 original matches remain reachable');
select pg_temp.assert_true((select count(*) = 1 from next_location_page where id = pg_temp.page_id(1)),
  'Original microseconds retain a row immediately below the cursor timestamp');
select pg_temp.assert_true((select count(*) = 0 from next_location_page where id = pg_temp.page_id(3000)),
  'Newer insertion does not shift the cursor page');
select pg_temp.assert_true((select id = pg_temp.page_id(3000) from matching_location_prayers
  order by created_at desc, id desc limit 1), 'Refresh reaches new insertions at the top');
select pg_temp.assert_true((select count(*) = 56 from matching_location_prayers), 'Refresh obtains a new total independently of the cursor');

create function pg_temp.location_page_plan() returns json language plpgsql as $$
declare result json;
begin
  execute $query$explain (format json)
    select id, body, created_at from matching_location_prayers
    where created_at < '2026-10-20T12:00:00.123456Z'
      or (created_at = '2026-10-20T12:00:00.123456Z' and id < '71000000-0000-0000-0000-000000000006')
    order by created_at desc, id desc limit 51$query$ into result;
  return result;
end;
$$;
select pg_temp.assert_true(pg_temp.location_page_plan()::text like '%prayer_requests_place_created_idx%',
  'Authenticated canonical-city cursor plan uses the existing place/created_at/id index without forced planner settings');
select pg_temp.location_page_plan();
rollback;
