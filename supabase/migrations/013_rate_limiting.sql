-- Rate limiting via RLS: limit inserts per user per time window

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_lookup
  on public.rate_limits (user_id, action, created_at desc);

create or replace function public.check_rate_limit(
  uid uuid,
  action text,
  max_count int,
  window_seconds int
)
returns boolean
language plpgsql
security definer
as $$
declare
  current_count int;
begin
  delete from public.rate_limits
  where created_at < now() - (window_seconds || ' seconds')::interval
    and user_id = uid
    and action = check_rate_limit.action;

  select count(*) into current_count
  from public.rate_limits
  where user_id = uid
    and action = check_rate_limit.action;

  if current_count >= max_count then
    return false;
  end if;

  insert into public.rate_limits (user_id, action)
  values (uid, check_rate_limit.action);

  return true;
end;
$$;

-- Replace prayer insert policy with rate-limited version
drop policy if exists "Authenticated users can create prayer requests" on public.prayer_requests;
create policy "Users can create prayer requests"
  on public.prayer_requests for insert
  with check (
    auth.role() = 'authenticated'
    and public.check_rate_limit(auth.uid(), 'create_prayer', 10, 3600)
  );

-- Replace comment insert policy with rate-limited version
drop policy if exists "Authenticated users can create comments" on public.comments;
create policy "Users can create comments"
  on public.comments for insert
  with check (
    auth.role() = 'authenticated'
    and public.check_rate_limit(auth.uid(), 'create_comment', 30, 3600)
  );
