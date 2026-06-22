-- Add UPDATE policy for reports so moderate page can resolve/dismiss

create policy "Moderators can update reports"
  on public.reports for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
