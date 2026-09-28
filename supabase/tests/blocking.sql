\set ON_ERROR_STOP on
begin;
create function pg_temp.test_id(n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
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
select pg_temp.test_id(n), 'blocking-' || n || '@example.com', jsonb_build_object('username', 'blocking_' || n)
from generate_series(1,5) n;
update public.profiles set is_moderator = true where id = pg_temp.test_id(4);
insert into public.prayer_circle_connections(user_a_id, user_b_id)
values (pg_temp.test_id(1), pg_temp.test_id(2)), (pg_temp.test_id(2), pg_temp.test_id(3));
insert into public.prayer_circle_invites(id, requester_id, recipient_id)
values (pg_temp.test_id(50), pg_temp.test_id(1), pg_temp.test_id(5));
insert into public.prayer_requests(id, user_id, body, audience, is_anonymous, location_city, location_country, location_lat, location_lng)
values
  (pg_temp.test_id(100), pg_temp.test_id(2), 'Public prayer from blocked account', 'public', false, 'London', 'United Kingdom', 51.5, -0.1),
  (pg_temp.test_id(101), pg_temp.test_id(2), 'Circle prayer from blocked account', 'circle', false, 'Unknown', 'Unknown', null, null),
  (pg_temp.test_id(102), pg_temp.test_id(2), 'Private prayer remains private', 'private', false, 'Unknown', 'Unknown', null, null),
  (pg_temp.test_id(103), pg_temp.test_id(2), 'Anonymous prayer remains unattributed', 'public', true, 'Unknown', 'Unknown', null, null),
  (pg_temp.test_id(104), pg_temp.test_id(1), 'Public prayer from the blocker', 'public', false, 'Unknown', 'Unknown', null, null),
  (pg_temp.test_id(105), pg_temp.test_id(3), 'Unrelated public prayer for replies', 'public', false, 'Unknown', 'Unknown', null, null);
insert into public.comments(id, prayer_id, user_id, body, parent_id)
values
  (pg_temp.test_id(200), pg_temp.test_id(105), pg_temp.test_id(2), 'Blocked author comment', null),
  (pg_temp.test_id(201), pg_temp.test_id(105), pg_temp.test_id(3), 'Reply on blocked thread', pg_temp.test_id(200)),
  (pg_temp.test_id(202), pg_temp.test_id(104), pg_temp.test_id(2), 'Existing comment preview', null);
insert into public.saved_prayers(user_id, prayer_id) values (pg_temp.test_id(1), pg_temp.test_id(100));
insert into public.reports(id, reportable_type, reportable_id, reported_by, reason, reporter_details)
values (pg_temp.test_id(300), 'prayer', pg_temp.test_id(101), pg_temp.test_id(1), 'QA safety', 'Private reporter details');
update public.profiles set username = 'renamed_2' where id = pg_temp.test_id(2);

set role anon;
select pg_temp.expect_error('select public.block_user(pg_temp.test_id(2))', '42501');
select pg_temp.expect_error('select public.unblock_user(pg_temp.test_id(2))', '42501');
select pg_temp.expect_error('select * from public.get_blocked_accounts()', '42501');
select pg_temp.expect_error('select public.respond_to_prayer_circle_invite(pg_temp.test_id(50), ''accepted'')', '42501');
select pg_temp.expect_error('select public.cancel_prayer_circle_invite(pg_temp.test_id(50))', '42501');
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect_error('select public.block_user(pg_temp.test_id(2))', '42501');
select pg_temp.expect_error('select public.unblock_user(pg_temp.test_id(2))', '42501');
select pg_temp.expect_error('select public.respond_to_prayer_circle_invite(pg_temp.test_id(50), ''accepted'')', '42501');
select pg_temp.expect_error('select public.cancel_prayer_circle_invite(pg_temp.test_id(50))', '42501');
select set_config('request.jwt.claim.sub', pg_temp.test_id(1)::text, false);
insert into public.prayer_circle_invites(id, requester_id, recipient_id)
values (pg_temp.test_id(51), auth.uid(), pg_temp.test_id(3));
select public.cancel_prayer_circle_invite(pg_temp.test_id(51));
select pg_temp.assert_true((select status = 'cancelled' from public.prayer_circle_invites where id = pg_temp.test_id(51)), 'Requester can still cancel their own pending invite');
select pg_temp.expect_error('select public.cancel_prayer_circle_invite(pg_temp.test_id(51))', '40001');
select pg_temp.expect_error('select public.block_user(auth.uid())', '22023');
select pg_temp.expect_error('select public.block_user(pg_temp.test_id(999))', 'P0002');
select pg_temp.expect_error('insert into public.user_blocks values (auth.uid(), pg_temp.test_id(2), now())', '42501');
select pg_temp.expect_error('update public.user_blocks set blocked_id = pg_temp.test_id(3)', '42501');
select pg_temp.expect_error('delete from public.user_blocks', '42501');
select pg_temp.expect_error('select public.respond_to_prayer_circle_invite(pg_temp.test_id(50), ''accepted'')', '42501');
select pg_temp.assert_true((select count(*) = 1 from public.resolve_profile_by_username('blocking_2')), 'Alias works before block');
select public.block_user(pg_temp.test_id(2));
select public.block_user(pg_temp.test_id(2));
select pg_temp.assert_true((select count(*) = 1 from public.user_blocks), 'Block is idempotent and owned by caller');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_circle_connections), 'Block removes connection');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests where user_id = pg_temp.test_id(2)), 'Block hides public, anonymous, Circle and Private prayers');
select pg_temp.assert_true(not public.can_view_prayer_request(pg_temp.test_id(100), auth.uid()), 'Direct visibility helper obeys block');
select pg_temp.assert_true(not public.can_view_prayer_request(pg_temp.test_id(100), pg_temp.test_id(3)), 'Cannot impersonate another viewer');
select pg_temp.assert_true((select count(*) = 0 from public.resolve_profile_by_username('blocking_2')), 'Old alias cannot bypass block');
select pg_temp.assert_true((select count(*) = 0 from public.profiles where id = pg_temp.test_id(2)), 'Profile and search reads obey block');
select pg_temp.assert_true((select count(*) = 0 from public.comments where id in (pg_temp.test_id(200), pg_temp.test_id(201), pg_temp.test_id(202))), 'Blocked comments, previews and replies disappear');
select pg_temp.assert_true((select count(*) = 0 from public.activity_events where actor_user_id = pg_temp.test_id(2)), 'Updates do not leak blocked actor');
select pg_temp.assert_true((select count(*) = 0 from public.saved_prayers), 'Saved prayer IDs obey access');
select pg_temp.assert_true((select count(*) = 0 from public.get_map_hotspot_totals()), 'Map aggregates exclude blocked content');
select pg_temp.assert_true((select username = 'renamed_2' from public.get_blocked_accounts()), 'Only own block list can show blocked identity');
select pg_temp.expect_error($q$insert into public.comments(prayer_id,user_id,body) values (pg_temp.test_id(100),auth.uid(),'Cannot comment now')$q$, '42501');
select pg_temp.expect_error($q$insert into public.comments(prayer_id,user_id,body,parent_id) values (pg_temp.test_id(105),auth.uid(),'Cannot reply now',pg_temp.test_id(200))$q$, '42501');
select pg_temp.expect_error($q$insert into public.prayer_interactions(prayer_id,user_id) values (pg_temp.test_id(100),auth.uid())$q$, '42501');
select pg_temp.expect_error($q$insert into public.saved_prayers(prayer_id,user_id) values (pg_temp.test_id(100),auth.uid())$q$, '42501');
select pg_temp.expect_error($q$insert into public.prayer_circle_invites(requester_id,recipient_id) values (auth.uid(),pg_temp.test_id(2))$q$, '42501');
select pg_temp.expect_error($q$insert into public.follows(follower_id,following_id) values (auth.uid(),pg_temp.test_id(2))$q$, '42501');
select pg_temp.assert_true((select reporter_details = 'Private reporter details' from public.reports where id = pg_temp.test_id(300)), 'Existing report remains available to reporter');

select set_config('request.jwt.claim.sub', pg_temp.test_id(2)::text, false);
select pg_temp.expect_error('select public.cancel_prayer_circle_invite(pg_temp.test_id(50))', '42501');
with edited as (
  update public.comments set body = 'Blocked edit' where id = pg_temp.test_id(202) returning id
)
select pg_temp.assert_true((select count(*) = 0 from edited), 'Even the comment owner cannot edit a blocked thread through the API');
select pg_temp.assert_true((select count(*) = 0 from public.user_blocks), 'Blocked user cannot read who blocked them');
select pg_temp.assert_true((select count(*) = 0 from public.get_blocked_accounts()), 'List RPC cannot enumerate incoming blocks');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests where user_id = pg_temp.test_id(1)), 'Visibility denial is mutual');
select public.unblock_user(pg_temp.test_id(1));
select pg_temp.assert_true(public.account_is_blocked(pg_temp.test_id(1)), 'Unblock cannot remove another person''s block');
select pg_temp.expect_error($q$insert into public.prayer_circle_invites(requester_id,recipient_id) values (auth.uid(),pg_temp.test_id(1))$q$, '42501');
select pg_temp.expect_error($q$insert into public.comments(prayer_id,user_id,body) values (pg_temp.test_id(104),auth.uid(),'Reverse comment denied')$q$, '42501');
select pg_temp.assert_true((select count(*) = 4 from public.prayer_requests where user_id = auth.uid()), 'Owner retains all own content');

select set_config('request.jwt.claim.sub', pg_temp.test_id(3)::text, false);
select pg_temp.assert_true((select count(*) = 3 from public.prayer_requests where user_id = pg_temp.test_id(2)), 'Other accepted peers retain public and Circle access, never Private');
select pg_temp.assert_true((select count(*) = 0 from public.get_blocked_accounts()), 'Unrelated user cannot enumerate blocks');

select set_config('request.jwt.claim.sub', pg_temp.test_id(4)::text, false);
select public.block_user(pg_temp.test_id(2));
select pg_temp.assert_true((public.get_report_review(pg_temp.test_id(300))->>'available')::boolean, 'Personal blocks cannot stop report-scoped moderator review');
select public.moderate_report(pg_temp.test_id(300), 'dismiss', 'QA still reviewable', public.get_report_review(pg_temp.test_id(300))->>'version');

select set_config('request.jwt.claim.sub', pg_temp.test_id(1)::text, false);
select public.unblock_user(pg_temp.test_id(2));
select public.unblock_user(pg_temp.test_id(2));
select pg_temp.assert_true(not public.account_is_blocked(pg_temp.test_id(2)), 'Own unblock is idempotent');
select pg_temp.assert_true((select count(*) = 2 from public.prayer_requests where user_id = pg_temp.test_id(2)), 'Unblock restores public content only, not Circle or Private');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_circle_connections), 'Unblock does not reconnect');
select pg_temp.assert_true((select count(*) = 0 from public.get_blocked_accounts()), 'Unblocked entry removed from own list');
select public.block_user(pg_temp.test_id(5));
select set_config('request.jwt.claim.sub', pg_temp.test_id(5)::text, false);
select pg_temp.expect_error($q$select public.respond_to_prayer_circle_invite(pg_temp.test_id(50),'accepted')$q$, '40001');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_circle_connections), 'Stale invite cannot recreate blocked connection');
select public.block_user(pg_temp.test_id(1));
select set_config('request.jwt.claim.sub', pg_temp.test_id(1)::text, false);
select public.unblock_user(pg_temp.test_id(5));
select pg_temp.assert_true(public.account_is_blocked(pg_temp.test_id(5)), 'Reciprocal block survives one-sided unblock');
reset role;
select pg_temp.assert_true((select status = 'cancelled' from public.prayer_circle_invites where id = pg_temp.test_id(50)), 'Block cancels pending invites');
select pg_temp.expect_error($q$insert into public.prayer_circle_connections(user_a_id,user_b_id) values (pg_temp.test_id(1),pg_temp.test_id(5))$q$, '42501');
rollback;
