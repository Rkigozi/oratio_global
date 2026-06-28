-- Tighten write policies so authenticated users can only create rows for themselves.

drop policy if exists "Users can create prayer requests" on public.prayer_requests;
create policy "Users can create prayer requests"
  on public.prayer_requests for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
    and public.check_rate_limit(auth.uid(), 'create_prayer', 10, 3600)
  );

drop policy if exists "Users can create comments" on public.comments;
create policy "Users can create comments"
  on public.comments for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
    and public.check_rate_limit(auth.uid(), 'create_comment', 30, 3600)
  );
