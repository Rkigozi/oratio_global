\set ON_ERROR_STOP on
begin;
create function pg_temp.test_id(n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
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

insert into auth.users(id, email, raw_user_meta_data)
select pg_temp.test_id(n), 'moderation-' || n || '@example.com', jsonb_build_object('username', 'moderation_' || n)
from generate_series(1,4) n;
update public.profiles set is_moderator = true where id = pg_temp.test_id(3);
insert into public.prayer_circle_connections(user_a_id, user_b_id)
values (pg_temp.test_id(1), pg_temp.test_id(2));
insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country, location_lat, location_lng)
values
  (pg_temp.test_id(100), pg_temp.test_id(1), 'Public moderation test prayer', 'public', 'London', 'United Kingdom', 51.5, -0.1),
  (pg_temp.test_id(101), pg_temp.test_id(1), 'Circle moderation test prayer', 'circle', 'Unknown', 'Unknown', null, null),
  (pg_temp.test_id(102), pg_temp.test_id(1), 'Never expose this private prayer', 'private', 'Unknown', 'Unknown', null, null),
  (pg_temp.test_id(103), pg_temp.test_id(1), 'Other public moderation prayer', 'public', 'Unknown', 'Unknown', null, null);
insert into public.comments(id, prayer_id, user_id, body, parent_id)
values
  (pg_temp.test_id(200), pg_temp.test_id(100), pg_temp.test_id(2), 'Reported comment', null),
  (pg_temp.test_id(201), pg_temp.test_id(100), pg_temp.test_id(1), 'Reply to reported comment', pg_temp.test_id(200));
insert into public.reports(id, reportable_type, reportable_id, reported_by, reason)
values
  (pg_temp.test_id(300), 'prayer', pg_temp.test_id(100), pg_temp.test_id(2), 'QA report'),
  (pg_temp.test_id(301), 'prayer', pg_temp.test_id(100), pg_temp.test_id(4), 'Second QA report'),
  (pg_temp.test_id(302), 'prayer', pg_temp.test_id(101), pg_temp.test_id(2), 'Circle QA report'),
  (pg_temp.test_id(303), 'prayer', pg_temp.test_id(102), pg_temp.test_id(2), 'Legacy private report'),
  (pg_temp.test_id(304), 'comment', pg_temp.test_id(200), pg_temp.test_id(1), 'Comment QA report'),
  (pg_temp.test_id(305), 'prayer', pg_temp.test_id(999), pg_temp.test_id(2), 'Deleted target');

set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', pg_temp.test_id(2)::text, false);
select pg_temp.expect_error('select public.get_report_review(pg_temp.test_id(300))', '42501');
select pg_temp.expect_error($q$select public.moderate_report(pg_temp.test_id(300), 'hide', 'Not a moderator', null)$q$, '42501');
select pg_temp.expect_error('select * from public.moderation_actions', '42501');
select pg_temp.expect_error($q$insert into public.reports(reportable_type, reportable_id, reported_by, reason, status) values ('prayer', pg_temp.test_id(103), auth.uid(), 'Forged', 'resolved')$q$, '42501');
insert into public.reports(reportable_type, reportable_id, reported_by, reason)
values ('prayer', pg_temp.test_id(103), auth.uid(), 'Ordinary reporting still works');
insert into public.reports(reportable_type, reportable_id, reported_by, reason, reporter_details)
values ('comment', pg_temp.test_id(201), auth.uid(), 'Extra context', 'Details visible to the reporter and moderators');
select pg_temp.assert_true((select reporter_details = 'Details visible to the reporter and moderators' from public.reports where reportable_id = pg_temp.test_id(201)), 'Reporter can submit and read optional details');
select pg_temp.expect_error($q$insert into public.reports(reportable_type, reportable_id, reported_by, reason, reporter_details) values ('prayer', pg_temp.test_id(100), auth.uid(), 'Too long', repeat('x', 1001))$q$, '23514');
select set_config('request.jwt.claim.sub', pg_temp.test_id(1)::text, false);
select pg_temp.assert_true((select count(*) = 0 from public.reports where reportable_id = pg_temp.test_id(201)), 'Content author cannot read somebody else''s reporter details');
select set_config('request.jwt.claim.sub', pg_temp.test_id(2)::text, false);
select pg_temp.assert_true(public.can_view_prayer_request(pg_temp.test_id(101), auth.uid()), 'Circle member can read before moderation');
select pg_temp.assert_true(not public.can_view_prayer_request(pg_temp.test_id(102), auth.uid()), 'Private remains owner-only');
select pg_temp.expect_error($q$insert into public.comments(prayer_id, user_id, body, parent_id) values (pg_temp.test_id(103), auth.uid(), 'Wrong prayer', pg_temp.test_id(200))$q$, '42501');

select set_config('request.jwt.claim.sub', pg_temp.test_id(3)::text, false);
select pg_temp.assert_true((select reporter_details = 'Details visible to the reporter and moderators' from public.reports where reportable_id = pg_temp.test_id(201)), 'Moderator can read reporter details');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests where audience in ('circle', 'private')), 'Moderator has no blanket Circle or Private access');
select pg_temp.assert_true(public.get_report_review(pg_temp.test_id(302)) #>> '{target,body}' = 'Circle moderation test prayer', 'Reported Circle content has scoped review access');
select pg_temp.assert_true((public.get_report_review(pg_temp.test_id(303))->>'available')::boolean = false, 'Private report does not reveal content');
select pg_temp.assert_true(public.get_report_review(pg_temp.test_id(303))->>'target' is null, 'Private body is absent from review response');
select pg_temp.assert_true((public.get_report_review(pg_temp.test_id(305))->>'available')::boolean = false, 'Deleted target has explicit unavailable state');
select pg_temp.expect_error($q$update public.reports set status = 'resolved' where id = pg_temp.test_id(300)$q$, '42501');
select pg_temp.expect_error($q$select public.moderate_report(pg_temp.test_id(300), 'hide', '', null)$q$, '22023');
select pg_temp.expect_error($q$select public.moderate_report(pg_temp.test_id(300), 'hide', 'Reviewed content', 'stale')$q$, '40001');
select pg_temp.expect_error($q$select public.moderate_report(pg_temp.test_id(303), 'hide', 'Private must stay private', null)$q$, '42501');
select pg_temp.expect_error('select public.get_report_review(pg_temp.test_id(9999))', 'P0002');
select pg_temp.assert_true(jsonb_array_length(public.get_report_review(pg_temp.test_id(300))->'actions') = 0, 'Rejected decisions leave no partial audit or enforcement');
select pg_temp.assert_true(not public.content_is_hidden('prayer', pg_temp.test_id(100)), 'Rejected decisions do not hide content');
select public.moderate_report(pg_temp.test_id(305), 'dismiss', 'Content no longer exists', null);

select public.moderate_report(pg_temp.test_id(304), 'hide', 'Remove test comment', public.get_report_review(pg_temp.test_id(304))->>'version');
select pg_temp.assert_true((select count(*) = 0 from public.comments where prayer_id = pg_temp.test_id(100)), 'Hidden comment and its replies are not readable');
select pg_temp.assert_true((select comment_count = 0 from public.prayer_requests where id = pg_temp.test_id(100)), 'Comment totals exclude hidden thread');
select set_config('request.jwt.claim.sub', pg_temp.test_id(1)::text, false);
select pg_temp.assert_true((select count(*) = 0 from public.activity_events where comment_id = pg_temp.test_id(200)), 'Hidden comment preview is absent from Updates');
select pg_temp.expect_error($q$insert into public.comments(prayer_id, user_id, body, parent_id) values (pg_temp.test_id(100), auth.uid(), 'Hidden reply', pg_temp.test_id(200))$q$, '42501');
select set_config('request.jwt.claim.sub', pg_temp.test_id(3)::text, false);
select public.moderate_report(pg_temp.test_id(304), 'restore', 'Restore test comment', public.get_report_review(pg_temp.test_id(304))->>'version');
select pg_temp.assert_true((select count(*) = 2 from public.comments where prayer_id = pg_temp.test_id(100)), 'Restore returns the comment and replies');
select pg_temp.assert_true((select comment_count = 2 from public.prayer_requests where id = pg_temp.test_id(100)), 'Restore repairs comment total');

select public.moderate_report(pg_temp.test_id(300), 'hide', 'Verified test enforcement', public.get_report_review(pg_temp.test_id(300))->>'version');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests where id = pg_temp.test_id(100)), 'Direct prayer read excludes hidden content');
select pg_temp.assert_true((select count(*) = 0 from public.comments where prayer_id = pg_temp.test_id(100)), 'Hidden prayer hides its comments');
select pg_temp.assert_true((select count(*) = 0 from public.get_map_hotspot_totals()), 'Map totals exclude hidden prayer');
select pg_temp.assert_true((select count(*) = 2 from public.reports where id in (pg_temp.test_id(300), pg_temp.test_id(301)) and status = 'resolved'), 'Hide resolves all pending reports for target');
select pg_temp.assert_true(jsonb_array_length(public.get_report_review(pg_temp.test_id(300))->'actions') = 1, 'Decision has one audit record');
select pg_temp.expect_error($q$select public.moderate_report(pg_temp.test_id(301), 'hide', 'Duplicate decision', null)$q$, '40001');

select set_config('request.jwt.claim.sub', pg_temp.test_id(2)::text, false);
select pg_temp.assert_true((select count(*) = 1 from public.activity_events where event_type = 'report_reviewed' and report_id = pg_temp.test_id(300)), 'Reporter receives review update');
select pg_temp.assert_true((select moderator_note is null from public.reports where id = pg_temp.test_id(300)), 'Internal decision note is not exposed to reporter');
select pg_temp.expect_error($q$insert into public.prayer_interactions(prayer_id, user_id) values (pg_temp.test_id(100), auth.uid())$q$, '42501');
select pg_temp.expect_error($q$insert into public.saved_prayers(prayer_id, user_id) values (pg_temp.test_id(100), auth.uid())$q$, '42501');
select set_config('request.jwt.claim.sub', pg_temp.test_id(1)::text, false);
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests where id = pg_temp.test_id(100)), 'Author cannot bypass hiding');
select pg_temp.expect_error('delete from public.moderated_content', '42501');

select set_config('request.jwt.claim.sub', pg_temp.test_id(3)::text, false);
select public.moderate_report(pg_temp.test_id(300), 'restore', 'Restore after QA', public.get_report_review(pg_temp.test_id(300))->>'version');
select pg_temp.assert_true((select count(*) = 1 from public.get_map_hotspot_totals()), 'Restoring prayer restores map aggregate');
select pg_temp.assert_true(jsonb_array_length(public.get_report_review(pg_temp.test_id(300))->'actions') = 2, 'Restoration appends to audit instead of overwriting it');
select public.moderate_report(pg_temp.test_id(302), 'hide', 'Circle test enforcement', public.get_report_review(pg_temp.test_id(302))->>'version');
select set_config('request.jwt.claim.sub', pg_temp.test_id(2)::text, false);
select pg_temp.assert_true(not public.can_view_prayer_request(pg_temp.test_id(101), auth.uid()), 'Hidden Circle prayer is inaccessible to members');
select set_config('request.jwt.claim.sub', pg_temp.test_id(3)::text, false);
select public.moderate_report(pg_temp.test_id(302), 'restore', 'Restore Circle prayer', public.get_report_review(pg_temp.test_id(302))->>'version');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_requests where id = pg_temp.test_id(101)), 'Restore does not make Circle content public');
reset role;
rollback;
