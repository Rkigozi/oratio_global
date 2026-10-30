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
-- Existing primary keys and RLS are the retry barriers; this fixture is synthetic.
insert into auth.users(id, email, raw_user_meta_data) values
  ('73000000-0000-4000-8000-000000000001', 'write-owner@example.com', '{"username":"write_owner"}'),
  ('73000000-0000-4000-8000-000000000002', 'write-peer@example.com', '{"username":"write_peer"}'),
  ('73000000-0000-4000-8000-000000000003', 'write-outsider@example.com', '{"username":"write_outsider"}');
insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country)
values ('73100000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000002', 'Synthetic public retry fixture', 'public', 'Unknown', 'Unknown');
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '73000000-0000-4000-8000-000000000001', false);
select pg_temp.assert_true(has_column_privilege('authenticated', 'public.reports', 'id', 'INSERT'), 'Authenticated reporters may supply a stable new report ID');
select pg_temp.assert_true(not has_column_privilege('authenticated', 'public.reports', 'id', 'UPDATE'), 'Report identity cannot be updated');
select pg_temp.assert_true(not has_column_privilege('authenticated', 'public.reports', 'status', 'INSERT'), 'Stable IDs do not grant moderation fields');
select pg_temp.expect_error($q$insert into public.reports(id, reported_by, reportable_type, reportable_id, reason, status) values
  ('73300000-0000-4000-8000-000000000099', auth.uid(), 'prayer', '73100000-0000-4000-8000-000000000001', 'Cannot forge review', 'resolved')$q$, '42501');
insert into public.comments(id, user_id, prayer_id, body) values
  ('73200000-0000-4000-8000-000000000001', auth.uid(), '73100000-0000-4000-8000-000000000001', 'Original synthetic encouragement');
select pg_temp.expect_error($q$insert into public.comments(id, user_id, prayer_id, body) values
  ('73200000-0000-4000-8000-000000000001', auth.uid(), '73100000-0000-4000-8000-000000000001', 'Retry must not replace original')$q$, '23505');
select pg_temp.assert_true((select count(*) = 1 from public.comments where id = '73200000-0000-4000-8000-000000000001' and user_id = auth.uid() and body = 'Original synthetic encouragement'), 'Original comment remains recoverable exactly once');
insert into public.reports(id, reported_by, reportable_type, reportable_id, reason, reporter_details) values
  ('73300000-0000-4000-8000-000000000001', auth.uid(), 'prayer', '73100000-0000-4000-8000-000000000001', 'Something else', 'Original synthetic context');
select pg_temp.expect_error($q$insert into public.reports(id, reported_by, reportable_type, reportable_id, reason, reporter_details) values
  ('73300000-0000-4000-8000-000000000001', auth.uid(), 'prayer', '73100000-0000-4000-8000-000000000001', 'Different reason', 'Retry must not replace details')$q$, '23505');
select pg_temp.assert_true((select count(*) = 1 from public.reports where id = '73300000-0000-4000-8000-000000000001' and reported_by = auth.uid() and reporter_details = 'Original synthetic context'), 'Reporter can recover original details without another report');
insert into public.prayer_circle_invites(id, requester_id, recipient_id) values
  ('73400000-0000-4000-8000-000000000001', auth.uid(), '73000000-0000-4000-8000-000000000002');
select pg_temp.expect_error($q$insert into public.prayer_circle_invites(id, requester_id, recipient_id) values
  ('73400000-0000-4000-8000-000000000001', auth.uid(), '73000000-0000-4000-8000-000000000002')$q$, '23505');
select pg_temp.assert_true((select count(*) = 1 from public.prayer_circle_invites where id = '73400000-0000-4000-8000-000000000001' and requester_id = auth.uid()), 'Requester recovers one original pending invite');
insert into public.prayer_interactions(user_id, prayer_id) values (auth.uid(), '73100000-0000-4000-8000-000000000001');
select pg_temp.expect_error($q$insert into public.prayer_interactions(user_id, prayer_id) values (auth.uid(), '73100000-0000-4000-8000-000000000001')$q$, '23505');
insert into public.saved_prayers(user_id, prayer_id) values (auth.uid(), '73100000-0000-4000-8000-000000000001');
select pg_temp.expect_error($q$insert into public.saved_prayers(user_id, prayer_id) values (auth.uid(), '73100000-0000-4000-8000-000000000001')$q$, '23505');
select pg_temp.assert_true((select count(*) = 1 from public.prayer_interactions where user_id = auth.uid()), 'Retry cannot increment an individual prayer response twice');
select pg_temp.assert_true((select count(*) = 1 from public.saved_prayers where user_id = auth.uid()), 'Retry cannot save an individual prayer twice');
select set_config('request.jwt.claim.sub', '73000000-0000-4000-8000-000000000002', false);
select public.respond_to_prayer_circle_invite('73400000-0000-4000-8000-000000000001', 'accepted');
select pg_temp.assert_true((select count(*) = 0 from public.reports where id = '73300000-0000-4000-8000-000000000001'), 'Reported author cannot read reporter context');
select set_config('request.jwt.claim.sub', '73000000-0000-4000-8000-000000000001', false);
select pg_temp.assert_true((select status = 'accepted' from public.prayer_circle_invites where id = '73400000-0000-4000-8000-000000000001' and requester_id = auth.uid()), 'Requester can recover the original invite after recipient acceptance');
reset role;
update public.reports set status = 'resolved' where id = '73300000-0000-4000-8000-000000000001';
set role authenticated;
select pg_temp.assert_true((select status = 'resolved' and reporter_details = 'Original synthetic context' from public.reports where id = '73300000-0000-4000-8000-000000000001' and reported_by = auth.uid()), 'Reporter can confirm a committed report after moderation resolves it');
select pg_temp.expect_error($q$insert into public.reports(id, reported_by, reportable_type, reportable_id, reason) values
  ('73300000-0000-4000-8000-000000000001', auth.uid(), 'prayer', '73100000-0000-4000-8000-000000000001', 'Same ID after resolution')$q$, '23505');
select set_config('request.jwt.claim.sub', '73000000-0000-4000-8000-000000000003', false);
select pg_temp.assert_true((select count(*) = 0 from public.comments where id = '73200000-0000-4000-8000-000000000001' and user_id = auth.uid()), 'Another account cannot claim an owner-scoped comment');
select pg_temp.assert_true((select count(*) = 0 from public.reports where id = '73300000-0000-4000-8000-000000000001'), 'Another account cannot read a resolved report');
select pg_temp.assert_true((select count(*) = 0 from public.prayer_circle_invites where id = '73400000-0000-4000-8000-000000000001'), 'Another account cannot read or claim the original invite');
select pg_temp.expect_error($q$insert into public.comments(user_id, prayer_id, body) values
  ('73000000-0000-4000-8000-000000000001', '73100000-0000-4000-8000-000000000001', 'Cannot impersonate original account')$q$, '42501');
select pg_temp.expect_error($q$insert into public.reports(id, reported_by, reportable_type, reportable_id, reason) values
  ('73300000-0000-4000-8000-000000000002', '73000000-0000-4000-8000-000000000001', 'prayer', '73100000-0000-4000-8000-000000000001', 'Cannot forge reporter')$q$, '42501');
rollback;
