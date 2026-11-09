-- Let a client retain one UUID across an uncertain report submission.
-- Existing INSERT RLS still fixes ownership/target visibility; moderator fields
-- remain excluded from column grants. This does not permit ID updates or upserts.
grant insert (id) on public.reports to authenticated;
