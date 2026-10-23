-- Waitlist emails and quota bookkeeping are not client-readable product data.
drop policy if exists "Authenticated users can view waitlist" on public.waitlist;
revoke all on public.waitlist from public, anon, authenticated;
grant insert (email, source) on public.waitlist to anon, authenticated;

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;

-- Keep the existing RLS call signature, but never trust client-supplied identity
-- or quota parameters. Only the fixed product limits may consume a slot.
create or replace function public.check_rate_limit(
  uid uuid,
  action text,
  max_count int,
  window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count int;
begin
  if auth.uid() is null or uid is distinct from auth.uid() then
    raise exception 'Only the current user can consume their quota' using errcode = '42501';
  end if;

  if action is null or action not in ('create_prayer', 'create_comment')
    or window_seconds is distinct from 3600
    or max_count is distinct from (case action when 'create_prayer' then 10 when 'create_comment' then 30 end) then
    raise exception 'Invalid rate limit parameters' using errcode = '22023';
  end if;

  -- Serialize same-user/action requests so concurrent inserts share one limit.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text || ':' || action, 0));

  delete from public.rate_limits
  where rate_limits.user_id = uid
    and rate_limits.action = check_rate_limit.action
    and rate_limits.created_at < now() - interval '1 hour';

  select count(*) into current_count
  from public.rate_limits
  where rate_limits.user_id = uid
    and rate_limits.action = check_rate_limit.action;

  if current_count >= max_count then
    return false;
  end if;

  insert into public.rate_limits(user_id, action)
  values (uid, check_rate_limit.action);
  return true;
end;
$$;

revoke all on function public.check_rate_limit(uuid, text, int, int) from public, anon;
grant execute on function public.check_rate_limit(uuid, text, int, int) to authenticated;
