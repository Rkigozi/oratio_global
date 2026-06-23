-- Align data access with the auth-first product model.
-- Anonymous users can reach marketing/auth/legal pages, but should not browse app data.

drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Anyone can view prayer requests" on public.prayer_requests;
create policy "Authenticated users can view prayer requests"
  on public.prayer_requests for select
  to authenticated
  using (true);

drop policy if exists "Anyone can view prayer interactions" on public.prayer_interactions;
create policy "Authenticated users can view prayer interactions"
  on public.prayer_interactions for select
  to authenticated
  using (true);

drop policy if exists "Anyone can view comments" on public.comments;
create policy "Authenticated users can view comments"
  on public.comments for select
  to authenticated
  using (true);

drop policy if exists "Anyone can view follows" on public.follows;
create policy "Authenticated users can view follows"
  on public.follows for select
  to authenticated
  using (true);
