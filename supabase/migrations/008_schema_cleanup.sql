-- Schema cleanup: remove dead columns, tables, and functions

-- 1. Drop unused columns from prayer_requests
alter table public.prayer_requests
  drop column if exists tags,
  drop column if exists is_answered,
  drop column if exists answered_at;

-- 2. Drop GIN index on tags (no longer needed)
drop index if exists idx_prayer_requests_tags;

-- 3. Drop unused push_subscriptions table
drop table if exists public.push_subscriptions;

-- 4. Drop unused language_preference column from profiles
alter table public.profiles
  drop column if exists language_preference;

-- 5. Drop unused subscribe_to_waitlist function (frontend uses direct insert)
drop function if exists public.subscribe_to_waitlist;
