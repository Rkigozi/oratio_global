\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', message; end if; end;
$$;
create function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$
declare actual text;
begin
  begin execute statement;
  exception when others then
    get stacked diagnostics actual = returned_sqlstate;
    if actual = expected then return; end if;
    raise exception 'Expected %, got %: %', expected, actual, sqlerrm;
  end;
  raise exception 'Expected an error';
end;
$$;
insert into auth.users(id, email, raw_user_meta_data) values
  ('60000000-0000-0000-0000-000000000001', 'places-one@example.com', '{"username":"places_one"}'),
  ('60000000-0000-0000-0000-000000000002', 'places-two@example.com', '{"username":"places_two"}');
insert into public.prayer_circle_connections(user_a_id, user_b_id)
  values ('60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002');
select pg_temp.assert_true((select count(*) > 30000 from public.prayer_places), 'Global catalog seeded');
select pg_temp.assert_true((select count(distinct country_code) > 200 from public.prayer_places), 'Catalog is not restricted to the old 30 cities');
select pg_temp.expect_error($q$insert into public.prayer_places(id, city, region, country_code, country, latitude, longitude, population, search_text)
  select id, city, region, country_code, country, latitude, longitude, population, search_text
  from public.prayer_places where id = 'geonames:2643743'$q$, '23505');

set role anon;
select pg_temp.expect_error('select * from public.prayer_places', '42501');
select pg_temp.expect_error($q$select * from public.search_prayer_places('London')$q$, '42501');
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.assert_true((select count(*) = 0 from public.search_prayer_places('London')), 'Missing identity cannot search under a role-only session');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_places), 'Missing identity cannot read catalog');
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000001', false);
select pg_temp.expect_error($q$update public.prayer_places set latitude = 1 where id = 'geonames:2643743'$q$, '42501');
select pg_temp.expect_error('delete from public.prayer_place_aliases', '42501');
select pg_temp.assert_true(public.resolve_prayer_place_id('London Borough of Lambeth', 'England') = 'geonames:2643743', 'London aliases resolve to one city');
select pg_temp.assert_true(public.resolve_prayer_place_id('  LONDON  ', 'gb') = 'geonames:2643743', 'Case and ISO code resolve consistently');
select pg_temp.assert_true(public.resolve_prayer_place_id('London', '') is null, 'No fabricated country from city alone');
select pg_temp.assert_true(public.resolve_prayer_place_id('Atlantis', 'GB') is null, 'Unsupported city stays unmapped');
select pg_temp.assert_true(public.resolve_prayer_place_id('Springfield', 'US') is null, 'Ambiguous cities require explicit selection');
select pg_temp.assert_true((select count(*) = 1 from public.find_prayer_place('Kampala', 'UG')), 'Automatic detection can resolve beyond the old catalog');
select pg_temp.assert_true((select count(*) = 1 from public.search_prayer_places('London UK') where id = 'geonames:2643743'), 'Combined city/country search');
select pg_temp.assert_true((select count(*) = 1 from public.search_prayer_places('Sao Paulo') where id = 'geonames:3448439'), 'Accent-insensitive city search');
select pg_temp.assert_true((select count(*) <= 12 from public.search_prayer_places('san')), 'Search results are bounded');
select pg_temp.assert_true((select count(*) = 0 from public.search_prayer_places('a')), 'Short searches are not executed');
select pg_temp.assert_true((select count(*) = 0 from public.search_prayer_places(repeat('x', 1000))), 'Long searches are rejected');
select pg_temp.assert_true((select count(*) = 0 from public.search_prayer_places($q$'); drop table public.prayer_places; --$q$)), 'Search operators remain data');

insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country,
  location_place_id, location_country_code, location_lat, location_lng)
values
  ('61000000-0000-0000-0000-000000000001', auth.uid(), 'Selected place ignores GPS', 'public', 'Wrong city', 'Wrong country', 'geonames:2643743', 'US', 51.5123456, -0.1234567),
  ('61000000-0000-0000-0000-000000000002', auth.uid(), 'Legacy names still resolve', 'public', 'Greater London', 'UK', null, null, 0.12345, 0.54321),
  ('61000000-0000-0000-0000-000000000003', auth.uid(), 'No location stays off map', 'public', 'Unknown', 'Unknown', null, null, 12.3456, 24.5678),
  ('61000000-0000-0000-0000-000000000004', auth.uid(), 'Unrecognized place preserved', 'public', 'Atlantis', 'Imaginary', null, null, 12.3456, 24.5678),
  ('61000000-0000-0000-0000-000000000005', auth.uid(), 'Private must discard place', 'private', 'London', 'United Kingdom', 'geonames:2643743', 'GB', 51.51, -0.13),
  ('61000000-0000-0000-0000-000000000006', auth.uid(), 'Circle never adds to map', 'circle', 'London', 'UK', 'geonames:2643743', 'GB', 51.5123, -0.12345);
select pg_temp.assert_true((select location_city = 'London' and location_country = 'United Kingdom'
  and location_country_code = 'GB' and location_lat = p.latitude and location_lng = p.longitude
  from public.prayer_requests pr cross join public.prayer_places p
  where pr.id = '61000000-0000-0000-0000-000000000001' and p.id = 'geonames:2643743'), 'Server derives canonical names, code and centroid');
select pg_temp.assert_true((select count(*) = 2 from public.prayer_requests where
  id in ('61000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000002')
  and location_place_id = 'geonames:2643743'), 'Aliases do not split place identity');
select pg_temp.assert_true((select count(*) = 2 from public.prayer_requests where
  id in ('61000000-0000-0000-0000-000000000003', '61000000-0000-0000-0000-000000000004')
  and location_place_id is null and location_lat is null and location_lng is null), 'Missing/unsupported places do not keep any supplied coordinates');
select pg_temp.assert_true((select location_city = '' and location_country = ''
  and location_place_id is null and location_country_code is null and location_lat is null and location_lng is null
  from public.prayer_requests where id = '61000000-0000-0000-0000-000000000005'), 'Private prayers store no place or location');
select pg_temp.assert_true((select location_city = 'Atlantis' and body = 'Unrecognized place preserved'
  from public.prayer_requests where id = '61000000-0000-0000-0000-000000000004'), 'Legacy unmapped text stays readable');
select pg_temp.expect_error($q$insert into public.prayer_requests(user_id, body, location_city, location_country, location_place_id)
  values (auth.uid(), 'Invalid place identity', 'London', 'UK', 'geonames:999999999999')$q$, '22023');
select pg_temp.expect_error($q$update public.prayer_requests set location_lat = 51.5123456
  where id = '61000000-0000-0000-0000-000000000001'$q$, '42501');
select pg_temp.assert_true((select count(*) = 1 and sum(request_count) = 2
  from public.get_map_hotspot_totals()), 'Map groups by canonical place, excluding private/Circle/unknown');
select pg_temp.assert_true((select location_place_id = 'geonames:2643743' and location_country_code = 'GB'
  from public.get_map_hotspot_totals()), 'Hotspot exposes stable identity and country code');
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000002', false);
select public.block_user('60000000-0000-0000-0000-000000000001');
select pg_temp.assert_true((select count(*) = 0 from public.get_map_hotspot_totals()), 'Catalog join does not bypass blocked-prayer RLS');
rollback;
