do $$
begin
  if (select count(*) from public.prayer_requests
    where user_id = '50000000-0000-0000-0000-000000000001') <> 3 then
    raise exception 'Rollout deleted legacy prayers';
  end if;
  if not exists (select 1 from public.prayer_requests
    where user_id = '50000000-0000-0000-0000-000000000001' and audience = 'public'
      and public_expires_at between now() + interval '13 days' and now() + interval '15 days'
      and created_at < now() - interval '300 days') then
    raise exception 'Legacy public prayer did not get a full rollout window';
  end if;
  if (select count(*) from public.prayer_requests
    where user_id = '50000000-0000-0000-0000-000000000001'
      and audience in ('circle', 'private') and public_expires_at is null) <> 2 then
    raise exception 'Rollout changed Circle or private deadlines';
  end if;
end;
$$;
delete from auth.users where id = '50000000-0000-0000-0000-000000000001';
