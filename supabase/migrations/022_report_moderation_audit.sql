-- Add a lightweight audit trail for report moderation decisions.

alter table public.reports
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists moderator_note text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_reports_status_created_at
  on public.reports(status, created_at desc);

create index if not exists idx_reports_resolved_by
  on public.reports(resolved_by);

create or replace function public.set_report_moderation_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();

  if new.status in ('resolved', 'dismissed') and old.status is distinct from new.status then
    new.resolved_at = coalesce(new.resolved_at, now());
    new.resolved_by = coalesce(new.resolved_by, auth.uid());
  elsif new.status = 'pending' and old.status is distinct from new.status then
    new.resolved_at = null;
    new.resolved_by = null;
    new.moderator_note = null;
  end if;

  return new;
end;
$$;

drop trigger if exists reports_set_moderation_audit_fields on public.reports;

create trigger reports_set_moderation_audit_fields
before update on public.reports
for each row
execute function public.set_report_moderation_audit_fields();

revoke all on function public.set_report_moderation_audit_fields() from public;
grant execute on function public.set_report_moderation_audit_fields() to authenticated;

grant select, insert on public.reports to authenticated;
grant update (status, resolved_at, resolved_by, moderator_note, updated_at)
  on public.reports to authenticated;
