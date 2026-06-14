-- Comments toggle per-prayer + profile preferences

-- 1. Add comments_enabled to prayer_requests (default true)
alter table public.prayer_requests
  add column if not exists comments_enabled boolean not null default true;

-- 2. Add preferences JSONB column to profiles for user settings
alter table public.profiles
  add column if not exists preferences jsonb not null default '{
    "notify_on_prayed": true,
    "notify_on_comment": true,
    "language": "auto",
    "comments_enabled_default": true
  }'::jsonb;
