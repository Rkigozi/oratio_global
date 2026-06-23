-- Restrict report review actions to explicit moderators.
-- Set public.profiles.is_moderator = true manually for trusted moderator accounts.

alter table public.profiles
  add column if not exists is_moderator boolean not null default false;

revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, bio, location, preferences, updated_at)
  on public.profiles to authenticated;

create or replace function public.current_user_is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_moderator = true
  );
$$;

revoke all on function public.current_user_is_moderator() from public;
grant execute on function public.current_user_is_moderator() to authenticated;

drop policy if exists "Moderators can view reports" on public.reports;
create policy "Moderators can view reports"
  on public.reports for select
  to authenticated
  using (public.current_user_is_moderator());

drop policy if exists "Moderators can update reports" on public.reports;
create policy "Moderators can update reports"
  on public.reports for update
  to authenticated
  using (public.current_user_is_moderator())
  with check (public.current_user_is_moderator());
