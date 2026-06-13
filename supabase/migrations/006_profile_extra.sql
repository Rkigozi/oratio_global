-- Add extra profile fields for the MVP
alter table public.profiles
  add column if not exists bio text,
  add column if not exists location text;
