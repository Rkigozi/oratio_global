-- Disposable-cluster fixture, installed before 043, never on a live backend.
insert into auth.users(id, email, raw_user_meta_data) values
  ('50000000-0000-0000-0000-000000000001', 'expiry-rollout@example.com', '{"username":"expiry_rollout"}');
insert into public.prayer_requests(user_id, body, audience, location_city, location_country, created_at)
select '50000000-0000-0000-0000-000000000001', 'Legacy rollout prayer', audience,
  'Unknown', 'Unknown', now() - interval '1 year'
from unnest(array['public', 'circle', 'private']) as audience;
