-- Track edits to prayer wording separately from operational row updates.
-- updated_at changes for counts/settings; edited_at only means the author changed the text.

alter table public.prayer_requests
  add column if not exists edited_at timestamptz;

create or replace function public.set_prayer_edited_at()
returns trigger
language plpgsql
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prayer_requests_edited_at on public.prayer_requests;
create trigger trg_prayer_requests_edited_at
  before update of body on public.prayer_requests
  for each row execute function public.set_prayer_edited_at();
