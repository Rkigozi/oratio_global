-- Add comment_count to prayer_requests with auto-update triggers

alter table public.prayer_requests
  add column if not exists comment_count integer not null default 0;

create or replace function public.increment_comment_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.prayer_requests
  set comment_count = comment_count + 1
  where id = new.prayer_id;
  return new;
end;
$$;

create or replace function public.decrement_comment_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.prayer_requests
  set comment_count = greatest(0, comment_count - 1)
  where id = old.prayer_id;
  return old;
end;
$$;

create trigger on_comment_inserted
  after insert on public.comments
  for each row execute function public.increment_comment_count();

create trigger on_comment_deleted
  after delete on public.comments
  for each row execute function public.decrement_comment_count();
