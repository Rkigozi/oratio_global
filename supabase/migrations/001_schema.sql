-- Oratio v1.0 — Database Schema
-- Run this in your Supabase project's SQL editor (SQL Editor → New Query)

-- 0. Extensions
create extension if not exists "pgcrypto";

-- 1. Users (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  language_preference text default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Prayer requests
create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) >= 10 and char_length(body) <= 500),
  category text,
  tags text[] default '{}',
  location_city text not null,
  location_country text not null,
  location_lat float,
  location_lng float,
  is_anonymous boolean not null default false,
  prayer_count integer not null default 0,
  is_answered boolean not null default false,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_prayer_requests_created on public.prayer_requests(created_at desc);
create index idx_prayer_requests_category on public.prayer_requests(category);
create index idx_prayer_requests_user on public.prayer_requests(user_id);
create index idx_prayer_requests_tags on public.prayer_requests using gin(tags);

alter table public.prayer_requests enable row level security;

create policy "Anyone can view prayer requests"
  on public.prayer_requests for select
  using (true);

create policy "Authenticated users can create prayer requests"
  on public.prayer_requests for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update own prayer requests"
  on public.prayer_requests for update
  using (auth.uid() = user_id);

create policy "Users can delete own prayer requests"
  on public.prayer_requests for delete
  using (auth.uid() = user_id);

-- 3. Prayer interactions ("I Prayed")
create table if not exists public.prayer_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prayer_id uuid not null references public.prayer_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, prayer_id)
);

create index idx_prayer_interactions_user on public.prayer_interactions(user_id);
create index idx_prayer_interactions_prayer on public.prayer_interactions(prayer_id);

alter table public.prayer_interactions enable row level security;

create policy "Anyone can view prayer interactions"
  on public.prayer_interactions for select
  using (true);

create policy "Users can create own prayer interactions"
  on public.prayer_interactions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own prayer interactions"
  on public.prayer_interactions for delete
  using (auth.uid() = user_id);

-- 4. Comments (Reddit-style: top-level + single-level replies)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid not null references public.prayer_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_comments_prayer on public.comments(prayer_id);
create index idx_comments_user on public.comments(user_id);
create index idx_comments_parent on public.comments(parent_id);

alter table public.comments enable row level security;

create policy "Anyone can view comments"
  on public.comments for select
  using (true);

create policy "Authenticated users can create comments"
  on public.comments for insert
  with check (auth.role() = 'authenticated');

create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- 5. Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reportable_type text not null check (reportable_type in ('prayer', 'comment')),
  reportable_id uuid not null,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_reports_status on public.reports(status);

alter table public.reports enable row level security;

create policy "Users can create reports"
  on public.reports for insert
  with check (auth.uid() = reported_by);

create policy "Users can view own reports"
  on public.reports for select
  using (auth.uid() = reported_by);

-- 6. Push notification subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id);

-- 7. Function: increment prayer count
create or replace function public.increment_prayer_count(p_prayer_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.prayer_requests
  set prayer_count = prayer_count + 1
  where id = p_prayer_id;
end;
$$;

-- 8. Function: decrement prayer count
create or replace function public.decrement_prayer_count(p_prayer_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.prayer_requests
  set prayer_count = greatest(0, prayer_count - 1)
  where id = p_prayer_id;
end;
$$;

-- 9. Trigger: auto-update updated_at
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger trg_prayer_requests_updated_at
  before update on public.prayer_requests
  for each row execute function public.update_updated_at();

create trigger trg_comments_updated_at
  before update on public.comments
  for each row execute function public.update_updated_at();
