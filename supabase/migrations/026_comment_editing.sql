-- Let commenters revise their own encouragement while preserving
-- public/circle prayer visibility rules.
drop policy if exists "Users can update own comments" on public.comments;

create policy "Users can update own comments"
  on public.comments for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.can_view_prayer_request(prayer_id, auth.uid())
  );

grant update (body) on public.comments to authenticated;
