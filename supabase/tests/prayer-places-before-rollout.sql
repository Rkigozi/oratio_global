insert into auth.users(id, email, raw_user_meta_data) values
  ('62000000-0000-0000-0000-000000000001', 'place-rollout@example.com', '{"username":"place_rollout"}');
insert into public.prayer_requests(id, user_id, body, audience, location_city, location_country, location_lat, location_lng)
values
  ('62000000-0000-0000-0000-000000000010', '62000000-0000-0000-0000-000000000001', 'Legacy known prayer location', 'public', 'Greater London', 'UK', 51.512345, -0.123456),
  ('62000000-0000-0000-0000-000000000011', '62000000-0000-0000-0000-000000000001', 'Legacy unknown prayer location', 'circle', 'Unmapped Town', 'Unknown Country', 12.345678, 45.678912),
  ('62000000-0000-0000-0000-000000000012', '62000000-0000-0000-0000-000000000001', 'Legacy private prayer location', 'private', 'London', 'UK', 51.512345, -0.123456);
-- The harness uses separate psql sessions. This fixture table exists only in
-- the disposable cluster and is dropped immediately after rollout verification.
create table public.place_rollout_snapshot as select id, user_id, body, audience, created_at, public_expires_at,
  prayer_count, comment_count, edited_at from public.prayer_requests;
