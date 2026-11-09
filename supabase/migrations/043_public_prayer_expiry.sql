-- Public requests leave discovery after 14 days, but remain in their owner's history.
-- Existing requests receive a full window from rollout; nothing is deleted.
-- Elapsed hours keep the window stable across daylight-saving changes.
alter table public.prayer_requests add column public_expires_at timestamptz;
update public.prayer_requests set public_expires_at = statement_timestamp() + interval '336 hours'
  where audience = 'public';
alter table public.prayer_requests add constraint prayer_public_expiry_check
  check ((audience = 'public' and public_expires_at is not null)
    or (audience <> 'public' and public_expires_at is null));
create index prayer_public_expiry_idx on public.prayer_requests(public_expires_at, created_at desc)
  where audience = 'public';

create function public.set_prayer_public_expiry()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.public_expires_at := case when new.audience = 'public'
      then statement_timestamp() + interval '336 hours' else null end;
  elsif new.audience is distinct from old.audience then
    new.public_expires_at := case when new.audience = 'public'
      then statement_timestamp() + interval '336 hours' else null end;
  end if;
  return new;
end;
$$;
create trigger set_prayer_public_expiry before insert or update on public.prayer_requests
  for each row execute function public.set_prayer_public_expiry();
revoke all on function public.set_prayer_public_expiry() from public, anon, authenticated;

-- Only the renewal RPC may change the deadline. Normal owner edits keep it intact.
revoke update on public.prayer_requests from public, anon, authenticated;
grant update (body, comments_enabled) on public.prayer_requests to authenticated;

create function public.renew_public_prayer(p_prayer_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_prayer public.prayer_requests%rowtype; v_expiry timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in to renew a prayer' using errcode = '42501';
  end if;
  select * into v_prayer from public.prayer_requests
    where id = p_prayer_id and user_id = auth.uid() for update;
  if not found or v_prayer.audience <> 'public'
    or public.content_is_hidden('prayer', p_prayer_id) then
    raise exception 'Prayer cannot be renewed' using errcode = '42501';
  end if;
  if v_prayer.public_expires_at > statement_timestamp() then
    raise exception 'This prayer is still active' using errcode = '22023';
  end if;
  v_expiry := statement_timestamp() + interval '336 hours';
  update public.prayer_requests set public_expires_at = v_expiry where id = p_prayer_id;
  return v_expiry;
end;
$$;
revoke all on function public.renew_public_prayer(uuid) from public, anon;
grant execute on function public.renew_public_prayer(uuid) to authenticated;

create policy "Expired public prayers remain only in owner history"
  on public.prayer_requests as restrictive for select to authenticated
  using (auth.uid() is not null
    and (audience <> 'public' or public_expires_at > now() or user_id = auth.uid()));

-- Comments, saves, reports and activity use this helper too. Keep moderation and
-- blocking checks, including caller identity, instead of only hiding feed rows.
create or replace function public.can_view_prayer_request(p_prayer_id uuid, p_viewer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_viewer_id = auth.uid() and exists (
    select 1 from public.prayer_requests pr where pr.id = p_prayer_id
      and not public.content_is_hidden('prayer', pr.id)
      and not public.account_is_blocked(pr.user_id)
      and (pr.user_id = p_viewer_id
        or (pr.audience = 'public' and pr.public_expires_at > now())
        or (pr.audience = 'circle' and public.users_are_in_prayer_circle(p_viewer_id, pr.user_id)))
  );
$$;

create policy "Archived public prayers cannot receive new comments"
  on public.comments as restrictive for insert to authenticated
  with check (exists (select 1 from public.prayer_requests pr where pr.id = prayer_id
    and (pr.audience <> 'public' or pr.public_expires_at > now())));
create policy "Archived public prayers cannot receive new prayers"
  on public.prayer_interactions as restrictive for insert to authenticated
  with check (exists (select 1 from public.prayer_requests pr where pr.id = prayer_id
    and (pr.audience <> 'public' or pr.public_expires_at > now())));
create policy "Archived public prayers cannot receive new saves"
  on public.saved_prayers as restrictive for insert to authenticated
  with check (exists (select 1 from public.prayer_requests pr where pr.id = prayer_id
    and (pr.audience <> 'public' or pr.public_expires_at > now())));

-- The map remains a security-invoker aggregate. The extra deadline lets clients
-- refresh counts when the next active request at a location expires.
drop function public.get_map_hotspot_totals();
create function public.get_map_hotspot_totals()
returns table (
  location_city text, location_country text,
  location_lat double precision, location_lng double precision,
  request_count integer, prayer_count integer,
  latest_created_at timestamptz, next_expires_at timestamptz
)
language sql stable security invoker set search_path = public as $$
  with prepared as (
    select pr.*,
      trim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
        lower(coalesce(pr.location_city, 'Unknown')), '&', ' and ', 'g'),
        '[.'',-]', ' ', 'g'), '\s+', ' ', 'g'),
        '^(city of |london borough of |royal borough of )', '')) as city_key,
      trim(regexp_replace(regexp_replace(regexp_replace(
        lower(coalesce(pr.location_country, 'Unknown')), '[.'',-]', ' ', 'g'),
        '\s+', ' ', 'g'), '^(the )', '')) as country_key
    from public.prayer_requests pr
    where pr.audience = 'public' and pr.public_expires_at > now()
      and pr.location_lat is not null and pr.location_lng is not null
      and not (pr.location_lat = 0 and pr.location_lng = 0)
      and lower(trim(coalesce(pr.location_city, ''))) not in ('', 'unknown')
      and lower(trim(coalesce(pr.location_country, ''))) not in ('', 'unknown')
  ), countries as (
    select *, case
      when country_key in ('uk', 'u k', 'united kingdom', 'great britain', 'britain',
        'england', 'scotland', 'wales', 'northern ireland') then 'United Kingdom'
      when country_key in ('us', 'usa', 'u s', 'u s a', 'united states',
        'united states of america') then 'United States'
      else coalesce(nullif(trim(location_country), ''), 'Unknown') end as canonical_country
    from prepared
  ), locations as (
    select *, case when canonical_country = 'United Kingdom' and city_key in (
      'london', 'greater london', 'city of london', 'barking and dagenham', 'barnet',
      'bexley', 'brent', 'bromley', 'camden', 'croydon', 'ealing', 'enfield', 'greenwich',
      'hackney', 'hammersmith and fulham', 'haringey', 'harrow', 'havering', 'hillingdon',
      'hounslow', 'islington', 'kensington and chelsea', 'kingston upon thames', 'lambeth',
      'lewisham', 'merton', 'newham', 'redbridge', 'richmond upon thames', 'southwark',
      'sutton', 'tower hamlets', 'waltham forest', 'wandsworth', 'westminster') then 'London'
      else coalesce(nullif(trim(location_city), ''), 'Unknown') end as canonical_city
    from countries
  ), totals as (
    select canonical_city, canonical_country,
      avg(location_lat)::double precision as lat, avg(location_lng)::double precision as lng,
      count(*)::integer as requests, max(created_at) as latest, min(public_expires_at) as expiry
    from locations group by canonical_city, canonical_country
  ), people as (
    select l.canonical_city, l.canonical_country, count(distinct pi.user_id)::integer as prayed
    from locations l left join public.prayer_interactions pi on pi.prayer_id = l.id
    group by l.canonical_city, l.canonical_country
  )
  select t.canonical_city, t.canonical_country, t.lat, t.lng, t.requests,
    coalesce(p.prayed, 0)::integer, t.latest, t.expiry
  from totals t left join people p
    on p.canonical_city = t.canonical_city and p.canonical_country = t.canonical_country
  order by t.latest desc;
$$;
revoke all on function public.get_map_hotspot_totals() from public, anon;
grant execute on function public.get_map_hotspot_totals() to authenticated;

notify pgrst, 'reload schema';
