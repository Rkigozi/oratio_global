-- Oratio v1.0 — Waitlist / Email Subscription
-- Run this in your Supabase project's SQL editor (SQL Editor → New Query)

-- 0. Extensions
-- Note: pgcrypto should already be enabled from 001_schema.sql

-- 1. Waitlist table
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing',
  created_at timestamptz not null default now(),
  constraint waitlist_email_key unique (email)
);

alter table public.waitlist enable row level security;

-- Allow anonymous inserts (anyone can join the waitlist)
create policy "Anyone can join the waitlist"
  on public.waitlist for insert
  with check (true);

-- Only authenticated users can view the waitlist
create policy "Authenticated users can view waitlist"
  on public.waitlist for select
  using (auth.role() = 'authenticated');

-- 2. Helper function: subscribe (returns 'exists' if already subscribed)
create or replace function public.subscribe_to_waitlist(p_email text, p_source text default 'landing')
returns json
language plpgsql
security definer
as $$
declare
  v_exists boolean;
begin
  select exists(select 1 from public.waitlist where email = p_email) into v_exists;

  if v_exists then
    return json_build_object('status', 'exists', 'message', 'Already subscribed');
  end if;

  insert into public.waitlist (email, source) values (p_email, p_source);
  return json_build_object('status', 'subscribed', 'message', 'Successfully subscribed');
end;
$$;
