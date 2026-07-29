-- Let people delete their own comments at any time, and let prayer authors
-- remove comments from their own prayer threads.

drop policy if exists "Users can delete own comments" on public.comments;
drop policy if exists "Users and prayer authors can delete comments" on public.comments;

create policy "Users and prayer authors can delete comments"
  on public.comments for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.prayer_requests pr
      where pr.id = comments.prayer_id
        and pr.user_id = auth.uid()
    )
    or public.current_user_is_moderator()
  );
