-- Keep moderation queues tidy by allowing one pending report per user/content pair.

with duplicate_pending_reports as (
  select
    id,
    row_number() over (
      partition by reported_by, reportable_type, reportable_id
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.reports
  where status = 'pending'
)
update public.reports
set
  status = 'dismissed',
  resolved_at = coalesce(resolved_at, now()),
  moderator_note = coalesce(
    moderator_note,
    'Auto-dismissed duplicate pending report before enabling duplicate-report protection.'
  )
where id in (
  select id
  from duplicate_pending_reports
  where duplicate_rank > 1
);

create unique index if not exists idx_reports_one_pending_per_user_target
  on public.reports(reported_by, reportable_type, reportable_id)
  where status = 'pending';
