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
  ('72000000-0000-4000-8000-000000000001', 'retry-one@example.com', '{"username":"retry_one"}'),
  ('72000000-0000-4000-8000-000000000002', 'retry-two@example.com', '{"username":"retry_two"}');
insert into public.prayer_circle_connections(user_a_id, user_b_id) values
  ('72000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000002');
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '72000000-0000-4000-8000-000000000001', false);
insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country) values
  ('72100000-0000-4000-8000-000000000001', auth.uid(), 'Retry fixture public', 'public', 'Unknown', 'Unknown'),
  ('72100000-0000-4000-8000-000000000002', auth.uid(), 'Retry fixture Circle', 'circle', 'Unknown', 'Unknown'),
  ('72100000-0000-4000-8000-000000000003', auth.uid(), 'Retry fixture Private', 'private', '', '');
create temp table initial_deadline as select public_expires_at from public.prayer_requests
  where id = '72100000-0000-4000-8000-000000000001';
select pg_temp.expect_error($q$insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country)
  values ('72100000-0000-4000-8000-000000000001', auth.uid(), 'Retry must not replace text', 'public', 'Unknown', 'Unknown')$q$, '23505');
select pg_temp.expect_error($q$insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country)
  values ('72100000-0000-4000-8000-000000000002', auth.uid(), 'Retry must not replace text', 'circle', 'Unknown', 'Unknown')$q$, '23505');
select pg_temp.expect_error($q$insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country)
  values ('72100000-0000-4000-8000-000000000003', auth.uid(), 'Retry must not replace text', 'private', '', '')$q$, '23505');
select pg_temp.assert_true((select count(*) = 3 from public.prayer_requests where user_id = auth.uid()),
  'Same-ID public/Circle/Private retries do not create additional rows');
select pg_temp.assert_true((select count(*) = 3 from public.prayer_requests
  where user_id = auth.uid() and body like 'Retry fixture %'), 'A retry never overwrites original content');
select pg_temp.assert_true((select count(*) = 1 from public.prayer_requests
  where id = '72100000-0000-4000-8000-000000000003' and user_id = auth.uid()), 'Owner can reconcile a committed Private prayer');
select pg_temp.assert_true((select count(*) = 1 from public.prayer_requests
  where id = '72100000-0000-4000-8000-000000000002' and user_id = auth.uid()), 'Owner can reconcile a committed Circle prayer');
select pg_temp.assert_true((select count(*) = 1 from public.prayer_requests
  where id = '72100000-0000-4000-8000-000000000001'
    and public_expires_at = (select public_expires_at from initial_deadline)), 'Retry does not replace or restart public expiry');
select set_config('request.jwt.claim.sub', '72000000-0000-4000-8000-000000000002', false);
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests
  where id = '72100000-0000-4000-8000-000000000003'), 'Another account cannot recover a Private prayer');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests
  where id = '72100000-0000-4000-8000-000000000001' and user_id = auth.uid()), 'Owner-scoped recovery does not claim another account public prayer');
select pg_temp.expect_error($q$insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country)
  values ('72100000-0000-4000-8000-000000000003', auth.uid(), 'Cannot overwrite another account', 'private', '', '')$q$, '23505');
select pg_temp.expect_error($q$insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country)
  values ('72100000-0000-4000-8000-000000000004', '72000000-0000-4000-8000-000000000001', 'Cannot impersonate original account', 'public', 'Unknown', 'Unknown')$q$, '42501');
rollback;
