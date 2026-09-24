-- Optional context supplied by the reporter, separate from internal decisions.
alter table public.reports add column reporter_details text;
alter table public.reports add constraint reports_reporter_details_length
  check (reporter_details is null or char_length(reporter_details) <= 1000);
grant insert (reporter_details) on public.reports to authenticated;
comment on column public.reports.reporter_details is
  'Optional reporter context. Readable only by the reporter and trusted moderators under report RLS.';
