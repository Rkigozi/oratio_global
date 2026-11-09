\set ON_ERROR_STOP on
begin;
set local timezone = 'Europe/London';
create function pg_temp.test_id(n integer) returns uuid language sql immutable as $$
  select ('40000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', message; end if;
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

insert into auth.users(id, email, raw_user_meta_data)
select pg_temp.test_id(n), 'expiry-' || n || '@example.com',
  jsonb_build_object('username', 'expiry_' || n) from generate_series(1,4) n;
update public.profiles set is_moderator = true where id = pg_temp.test_id(4);
insert into public.prayer_circle_connections(user_a_id, user_b_id)
values (pg_temp.test_id(1), pg_temp.test_id(2));
insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country,
  location_lat, location_lng, created_at)
values
  (pg_temp.test_id(100), pg_temp.test_id(1), 'Public active prayer', 'public', 'London', 'UK', 51.5, -0.1, now() - interval '30 days'),
  (pg_temp.test_id(101), pg_temp.test_id(1), 'Public archived prayer', 'public', 'London', 'United Kingdom', 51.5, -0.1, now() - interval '30 days'),
  (pg_temp.test_id(102), pg_temp.test_id(1), 'Private journal prayer', 'private', '', '', null, null, now() - interval '30 days'),
  (pg_temp.test_id(103), pg_temp.test_id(1), 'Circle shared prayer', 'circle', 'Unknown', 'Unknown', null, null, now() - interval '30 days'),
  (pg_temp.test_id(104), pg_temp.test_id(1), 'Moderated archived prayer', 'public', 'Paris', 'France', 48.9, 2.3, now()),
  (pg_temp.test_id(105), pg_temp.test_id(1), 'Anonymous archived prayer', 'public', 'Paris', 'France', 48.9, 2.3, now());
update public.prayer_requests set is_anonymous = true where id = pg_temp.test_id(105);
insert into public.comments(id, prayer_id, user_id, body)
values (pg_temp.test_id(200), pg_temp.test_id(101), pg_temp.test_id(2), 'Keep this prayer comment');
insert into public.prayer_interactions(prayer_id, user_id)
values (pg_temp.test_id(101), pg_temp.test_id(2)), (pg_temp.test_id(100), pg_temp.test_id(2));
insert into public.saved_prayers(prayer_id, user_id)
values (pg_temp.test_id(101), pg_temp.test_id(2));
insert into public.reports(id, reportable_type, reportable_id, reported_by, reason)
values (pg_temp.test_id(300), 'prayer', pg_temp.test_id(101), pg_temp.test_id(2), 'Report before expiry');
update public.prayer_requests set public_expires_at = now()
  where id in (pg_temp.test_id(101), pg_temp.test_id(104), pg_temp.test_id(105));
insert into public.moderated_content(reportable_type, reportable_id)
values ('prayer', pg_temp.test_id(104));

set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', pg_temp.test_id(1)::text, false);
with inserted as (
  insert into public.prayer_requests(user_id, body, audience, location_city, location_country, public_expires_at)
  values (auth.uid(), 'Server controls the public deadline', 'public', 'Unknown', 'Unknown', '2100-01-01')
  returning public_expires_at
)
select pg_temp.assert_true((select public_expires_at = statement_timestamp() + interval '336 hours' from inserted),
  'Server ignores supplied expiry and gives exactly 336 hours across daylight-saving changes');
select pg_temp.assert_true((select public_expires_at > now() + interval '13 days'
  from public.prayer_requests where id = pg_temp.test_id(100)), 'Public insert gets a full server window even with old created_at');
select pg_temp.assert_true((select count(*) = 2 from public.prayer_requests
  where id in (pg_temp.test_id(102), pg_temp.test_id(103)) and public_expires_at is null), 'Private and Circle do not expire');
select pg_temp.assert_true((select count(*) = 1 from public.prayer_requests where id = pg_temp.test_id(101)), 'Owner retains direct archive access');
select pg_temp.assert_true((select count(*) = 1 from public.comments where id = pg_temp.test_id(200)), 'Owner retains archived comments');
select pg_temp.assert_true((select prayer_count = 1 and comment_count = 1 from public.prayer_requests where id = pg_temp.test_id(101)), 'Archive preserves counts');
select pg_temp.assert_true((select sum(request_count) = 1 and sum(prayer_count) = 1 from public.get_map_hotspot_totals()), 'Owner map excludes their own archive and counts only active requests');
select pg_temp.assert_true((select next_expires_at > now() from public.get_map_hotspot_totals()), 'Map includes next refresh deadline');
select pg_temp.expect_error($q$update public.prayer_requests set public_expires_at = now() + interval '1 year' where id = pg_temp.test_id(101)$q$, '42501');
select pg_temp.expect_error($q$update public.prayer_requests set created_at = now() where id = pg_temp.test_id(101)$q$, '42501');
select pg_temp.expect_error($q$update public.prayer_requests set audience = 'private' where id = pg_temp.test_id(101)$q$, '42501');
update public.prayer_requests set body = 'Edited but still archived prayer' where id = pg_temp.test_id(101);
update public.prayer_requests set comments_enabled = false where id = pg_temp.test_id(100);
select pg_temp.assert_true((select public_expires_at = now() from public.prayer_requests where id = pg_temp.test_id(101)), 'Editing does not restart expiry');
select pg_temp.expect_error($q$insert into public.comments(prayer_id, user_id, body) values (pg_temp.test_id(101), auth.uid(), 'No new archived comment')$q$, '42501');
select pg_temp.expect_error($q$insert into public.prayer_interactions(prayer_id, user_id) values (pg_temp.test_id(101), auth.uid())$q$, '42501');
select pg_temp.expect_error($q$insert into public.saved_prayers(prayer_id, user_id) values (pg_temp.test_id(101), auth.uid())$q$, '42501');
select pg_temp.expect_error('select public.renew_public_prayer(pg_temp.test_id(100))', '22023');
select pg_temp.expect_error('select public.renew_public_prayer(pg_temp.test_id(102))', '42501');
select pg_temp.expect_error('select public.renew_public_prayer(pg_temp.test_id(103))', '42501');
select pg_temp.expect_error('select public.renew_public_prayer(pg_temp.test_id(104))', '42501');
select pg_temp.expect_error('select public.renew_public_prayer(pg_temp.test_id(999))', '42501');

select set_config('request.jwt.claim.sub', pg_temp.test_id(2)::text, false);
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests where id in (pg_temp.test_id(101), pg_temp.test_id(105))), 'Expired and anonymous prayers disappear at the exact deadline');
select pg_temp.assert_true(not public.can_view_prayer_request(pg_temp.test_id(101), auth.uid()), 'Related-content helper denies archive access');
select pg_temp.assert_true(not public.can_view_prayer_request(pg_temp.test_id(101), pg_temp.test_id(1)), 'Viewer identity cannot be spoofed');
select pg_temp.assert_true((select count(*) = 0 from public.comments where id = pg_temp.test_id(200)), 'Archived comments are hidden from other people');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_interactions where prayer_id = pg_temp.test_id(101)), 'Archived interactions are hidden');
select pg_temp.assert_true((select count(*) = 0 from public.saved_prayers where prayer_id = pg_temp.test_id(101)), 'Saved links do not bypass expiry');
select pg_temp.assert_true((select count(*) = 1 from public.prayer_requests where id = pg_temp.test_id(103)), 'Accepted peer still sees old Circle prayer');
select pg_temp.expect_error('select public.renew_public_prayer(pg_temp.test_id(101))', '42501');
select pg_temp.expect_error($q$insert into public.comments(prayer_id, user_id, body) values (pg_temp.test_id(101), auth.uid(), 'No archived comment')$q$, '42501');
select pg_temp.expect_error($q$insert into public.reports(reportable_type, reportable_id, reported_by, reason) values ('prayer', pg_temp.test_id(101), auth.uid(), 'Cannot report inaccessible archive')$q$, '42501');

select set_config('request.jwt.claim.sub', pg_temp.test_id(3)::text, false);
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests where id = pg_temp.test_id(103)), 'Circle isolation is unchanged');
select set_config('request.jwt.claim.sub', pg_temp.test_id(4)::text, false);
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests where id = pg_temp.test_id(101)), 'Moderator has no blanket archive access');
select pg_temp.assert_true((public.get_report_review(pg_temp.test_id(300))->>'available')::boolean, 'Moderator can still review a pre-expiry report');

select set_config('request.jwt.claim.sub', pg_temp.test_id(1)::text, false);
select pg_temp.assert_true(public.renew_public_prayer(pg_temp.test_id(101)) > now() + interval '13 days', 'Owner renews expired request for a new server window');
select pg_temp.assert_true((select created_at = now() - interval '30 days' and prayer_count = 1 and comment_count = 1
  from public.prayer_requests where id = pg_temp.test_id(101)), 'Renewal preserves identity, original date and history');
select pg_temp.expect_error('select public.renew_public_prayer(pg_temp.test_id(101))', '22023');
select pg_temp.assert_true((select sum(request_count) = 2 and sum(prayer_count) = 1 from public.get_map_hotspot_totals()), 'Renewal restores map request but does not double-count the same person');
select set_config('request.jwt.claim.sub', pg_temp.test_id(2)::text, false);
select pg_temp.assert_true((select count(*) = 1 from public.prayer_requests where id = pg_temp.test_id(101)), 'Renewed shared link works again');
select pg_temp.assert_true((select count(*) = 1 from public.saved_prayers where prayer_id = pg_temp.test_id(101)), 'Renewal restores the existing save without duplicating it');
select public.block_user(pg_temp.test_id(1));
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests where id = pg_temp.test_id(101)), 'Renewal does not bypass blocking');

set role anon;
select set_config('request.jwt.claim.role', 'anon', false);
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect_error('select public.renew_public_prayer(pg_temp.test_id(101))', '42501');
set role authenticated;
select pg_temp.expect_error('select public.renew_public_prayer(pg_temp.test_id(101))', '42501');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests), 'Missing identity cannot read public prayers through a role-only session');
reset role;
rollback;
