-- Fix ambiguous column references in the rate-limit helper used by insert RLS.

create or replace function public.check_rate_limit(
  uid uuid,
  action text,
  max_count int,
  window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
begin
  delete from public.rate_limits
  where rate_limits.created_at < now() - (window_seconds || ' seconds')::interval
    and rate_limits.user_id = uid
    and rate_limits.action = check_rate_limit.action;

  select count(*) into current_count
  from public.rate_limits
  where rate_limits.user_id = uid
    and rate_limits.action = check_rate_limit.action;

  if current_count >= max_count then
    return false;
  end if;

  insert into public.rate_limits (user_id, action)
  values (uid, check_rate_limit.action);

  return true;
end;
$$;
