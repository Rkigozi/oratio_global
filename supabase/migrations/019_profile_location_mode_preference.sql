-- Persist whether a profile location was entered manually or auto-detected.
-- Existing rows are safe to merge because preferences is a JSONB object.

alter table public.profiles
  alter column preferences set default '{
    "notify_on_prayed": true,
    "notify_on_comment": true,
    "language": "auto",
    "comments_enabled_default": true,
    "profile_location_mode": "manual"
  }'::jsonb;

update public.profiles
set preferences = coalesce(preferences, '{}'::jsonb) || '{"profile_location_mode": "manual"}'::jsonb
where coalesce(preferences, '{}'::jsonb) ? 'profile_location_mode' = false;
