-- Let users clear their own Updates inbox without affecting anyone else.

drop policy if exists "Users can delete own activity events" on public.activity_events;

create policy "Users can delete own activity events"
  on public.activity_events for delete
  to authenticated
  using (auth.uid() = recipient_user_id);

grant delete on public.activity_events to authenticated;
