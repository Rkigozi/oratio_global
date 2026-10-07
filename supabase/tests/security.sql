\set ON_ERROR_STOP on
begin;
create function pg_temp.test_id(n integer) returns uuid language sql immutable as $$
  select ('20000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', message; end if;
  raise notice 'PASS: %', message;
end;
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
  raise exception 'Expected an error: %', statement;
end;
$$;

select pg_temp.assert_true(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
), 'Every public table has RLS enabled');

insert into auth.users(id, email, raw_user_meta_data)
select pg_temp.test_id(n), 'security-' || n || '@example.com', jsonb_build_object('username', 'security_' || n)
from generate_series(1,2) n;
insert into public.rate_limits(user_id, action, created_at)
values (pg_temp.test_id(2), 'create_prayer', now());

set role anon;
select set_config('request.jwt.claim.role', 'anon', false);
select set_config('request.jwt.claim.sub', '', false);
insert into public.waitlist(email, source) values ('anonymous-signup@example.com', 'landing');
select pg_temp.expect_error('select * from public.waitlist', '42501');
select pg_temp.expect_error('select * from public.rate_limits', '42501');
select pg_temp.expect_error($q$select public.check_rate_limit(pg_temp.test_id(2), 'create_prayer', 10, 3600)$q$, '42501');

set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', pg_temp.test_id(1)::text, false);
insert into public.waitlist(email, source) values ('signed-in-signup@example.com', 'landing');
select pg_temp.expect_error('select * from public.waitlist', '42501');
select pg_temp.expect_error($q$update public.waitlist set email = 'changed@example.com'$q$, '42501');
select pg_temp.expect_error('delete from public.waitlist', '42501');
select pg_temp.expect_error('select * from public.rate_limits', '42501');
select pg_temp.expect_error($q$insert into public.rate_limits(user_id, action) values (auth.uid(), 'create_prayer')$q$, '42501');
select pg_temp.expect_error($q$update public.rate_limits set created_at = now() - interval '2 hours'$q$, '42501');
select pg_temp.expect_error('delete from public.rate_limits', '42501');
select pg_temp.expect_error('truncate public.rate_limits', '42501');
select pg_temp.expect_error('truncate public.waitlist', '42501');
select pg_temp.expect_error($q$select public.check_rate_limit(pg_temp.test_id(2), 'create_prayer', 10, 3600)$q$, '42501');
select pg_temp.expect_error($q$select public.check_rate_limit(null, 'create_prayer', 10, 3600)$q$, '42501');
select pg_temp.expect_error($q$select public.check_rate_limit(auth.uid(), 'create_prayer', 1000000, 3600)$q$, '22023');
select pg_temp.expect_error($q$select public.check_rate_limit(auth.uid(), 'create_prayer', 10, 0)$q$, '22023');
select pg_temp.expect_error($q$select public.check_rate_limit(auth.uid(), 'create_prayer', 10, null)$q$, '22023');
select pg_temp.expect_error($q$select public.check_rate_limit(auth.uid(), 'create_prayer', null, 3600)$q$, '22023');
select pg_temp.expect_error($q$select public.check_rate_limit(auth.uid(), 'arbitrary_action', 10, 3600)$q$, '22023');
select pg_temp.expect_error($q$select public.check_rate_limit(auth.uid(), null, 10, 3600)$q$, '22023');
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect_error($q$select public.check_rate_limit(pg_temp.test_id(1), 'create_prayer', 10, 3600)$q$, '42501');
select set_config('request.jwt.claim.sub', pg_temp.test_id(1)::text, false);
select pg_temp.assert_true((select bool_and(public.check_rate_limit(auth.uid(), 'create_prayer', 10, 3600)) from generate_series(1,10)), 'First ten prayer checks succeed');
select pg_temp.assert_true(not public.check_rate_limit(auth.uid(), 'create_prayer', 10, 3600), 'Eleventh prayer check is denied');
select pg_temp.assert_true((select bool_and(public.check_rate_limit(auth.uid(), 'create_comment', 30, 3600)) from generate_series(1,30)), 'Comment quota is independent and allows thirty checks');
select pg_temp.assert_true(not public.check_rate_limit(auth.uid(), 'create_comment', 30, 3600), 'Thirty-first comment check is denied');
select set_config('request.jwt.claim.sub', pg_temp.test_id(2)::text, false);
select pg_temp.assert_true(public.check_rate_limit(auth.uid(), 'create_prayer', 10, 3600), 'Other user quota is independent');

reset role;
select pg_temp.assert_true((select count(*) = 2 from public.waitlist where email like '%signup@example.com'), 'Anonymous and signed-in landing signups still persist');
select pg_temp.assert_true((select count(*) = 2 from public.rate_limits where user_id = pg_temp.test_id(2)), 'Rejected spoofing did not change another user quota');
update public.rate_limits set created_at = now() - interval '2 hours' where user_id = pg_temp.test_id(1) and action = 'create_prayer';
set role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.test_id(1)::text, false);
select pg_temp.assert_true(public.check_rate_limit(auth.uid(), 'create_prayer', 10, 3600), 'Expired quota can be used again');
select pg_temp.assert_true(not public.check_rate_limit(auth.uid(), 'create_comment', 30, 3600), 'Pruning prayer quota does not reset comments');

-- Exercise actual insert RLS, not only direct calls to its helper.
reset role;
delete from public.rate_limits where user_id = pg_temp.test_id(1);
set role authenticated;
insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country)
values (pg_temp.test_id(100), auth.uid(), 'Security quota test prayer', 'public', 'Unknown', 'Unknown');
insert into public.comments(prayer_id, user_id, body)
values (pg_temp.test_id(100), auth.uid(), 'Security quota test comment');
select pg_temp.assert_true((select count(*) = 1 from public.prayer_requests where id = pg_temp.test_id(100)), 'Prayer insert still works through RLS');
select pg_temp.assert_true((select count(*) = 1 from public.comments where prayer_id = pg_temp.test_id(100)), 'Comment insert still works through RLS');
select pg_temp.expect_error('update public.profiles set is_moderator = true where id = auth.uid()', '42501');
select pg_temp.assert_true(not public.current_user_is_moderator(), 'User cannot promote themselves to moderator');

reset role;
select pg_temp.assert_true((select count(*) = 2 from public.rate_limits where user_id = pg_temp.test_id(1)), 'Actual inserts each consumed a quota slot');
set role service_role;
select pg_temp.assert_true((select count(*) = 2 from public.waitlist where email like '%signup@example.com'), 'Trusted backend retains waitlist access');
reset role;
rollback;
