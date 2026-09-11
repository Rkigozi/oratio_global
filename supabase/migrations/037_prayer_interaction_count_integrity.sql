-- Keep prayer totals derived from prayer_interactions in the same transaction
-- as the interaction itself. The previous public RPCs allowed the cached count
-- to be changed independently of an interaction.

create or replace function public.sync_prayer_count_from_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.prayer_requests
    set prayer_count = prayer_count + 1
    where id = new.prayer_id;
    return new;
  end if;

  update public.prayer_requests
  set prayer_count = greatest(0, prayer_count - 1)
  where id = old.prayer_id;
  return old;
end;
$$;

revoke all on function public.sync_prayer_count_from_interaction() from public;
revoke all on function public.sync_prayer_count_from_interaction() from anon;
revoke all on function public.sync_prayer_count_from_interaction() from authenticated;

drop trigger if exists prayer_interactions_sync_prayer_count
  on public.prayer_interactions;
create trigger prayer_interactions_sync_prayer_count
after insert or delete on public.prayer_interactions
for each row
execute function public.sync_prayer_count_from_interaction();

-- Repair any totals that drifted while interactions and counts were separate.
update public.prayer_requests pr
set prayer_count = (
  select count(*)::integer
  from public.prayer_interactions pi
  where pi.prayer_id = pr.id
);

-- These legacy functions bypass RLS and must no longer be callable by clients.
revoke all on function public.increment_prayer_count(uuid) from public;
revoke all on function public.increment_prayer_count(uuid) from anon;
revoke all on function public.increment_prayer_count(uuid) from authenticated;
revoke all on function public.decrement_prayer_count(uuid) from public;
revoke all on function public.decrement_prayer_count(uuid) from anon;
revoke all on function public.decrement_prayer_count(uuid) from authenticated;
