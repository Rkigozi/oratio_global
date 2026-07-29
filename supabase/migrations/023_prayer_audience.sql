-- Add a small, explicit visibility model for V1.
-- Existing prayers remain public. Circle prayers are only visible to the
-- author and people with an accepted Prayer Circle connection.

alter table public.prayer_requests
  add column if not exists audience text not null default 'public';

alter table public.prayer_requests
  drop constraint if exists prayer_requests_audience_check;

alter table public.prayer_requests
  add constraint prayer_requests_audience_check
  check (audience in ('public', 'circle'));

create index if not exists idx_prayer_requests_audience_created
  on public.prayer_requests(audience, created_at desc);

create or replace function public.users_are_in_prayer_circle(
  p_user_id uuid,
  p_other_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and p_other_user_id is not null
    and (
      p_user_id = p_other_user_id
      or exists (
        select 1
        from public.prayer_circle_connections c
        where (
          c.user_a_id = p_user_id
          and c.user_b_id = p_other_user_id
        )
        or (
          c.user_a_id = p_other_user_id
          and c.user_b_id = p_user_id
        )
      )
    );
$$;

create or replace function public.can_view_prayer_request(
  p_prayer_id uuid,
  p_viewer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.prayer_requests pr
    where pr.id = p_prayer_id
      and (
        pr.audience = 'public'
        or pr.user_id = p_viewer_id
        or public.users_are_in_prayer_circle(p_viewer_id, pr.user_id)
      )
  );
$$;

revoke all on function public.users_are_in_prayer_circle(uuid, uuid) from public;
revoke all on function public.can_view_prayer_request(uuid, uuid) from public;

grant execute on function public.users_are_in_prayer_circle(uuid, uuid) to authenticated;
grant execute on function public.can_view_prayer_request(uuid, uuid) to authenticated;

drop policy if exists "Anyone can view prayer requests" on public.prayer_requests;
drop policy if exists "Authenticated users can view prayer requests" on public.prayer_requests;
create policy "Authenticated users can view visible prayer requests"
  on public.prayer_requests for select
  to authenticated
  using (
    audience = 'public'
    or auth.uid() = user_id
    or public.users_are_in_prayer_circle(auth.uid(), user_id)
  );

drop policy if exists "Authenticated users can create prayer requests" on public.prayer_requests;
drop policy if exists "Users can create prayer requests" on public.prayer_requests;
create policy "Users can create prayer requests"
  on public.prayer_requests for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and audience in ('public', 'circle')
    and public.check_rate_limit(auth.uid(), 'create_prayer', 10, 3600)
  );

drop policy if exists "Anyone can view comments" on public.comments;
drop policy if exists "Authenticated users can view comments" on public.comments;
create policy "Authenticated users can view comments on visible prayers"
  on public.comments for select
  to authenticated
  using (public.can_view_prayer_request(prayer_id, auth.uid()));

drop policy if exists "Authenticated users can create comments" on public.comments;
drop policy if exists "Users can create comments" on public.comments;
create policy "Users can create comments"
  on public.comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.can_view_prayer_request(prayer_id, auth.uid())
    and public.check_rate_limit(auth.uid(), 'create_comment', 30, 3600)
  );

drop policy if exists "Anyone can view prayer interactions" on public.prayer_interactions;
drop policy if exists "Authenticated users can view prayer interactions" on public.prayer_interactions;
create policy "Authenticated users can view interactions on visible prayers"
  on public.prayer_interactions for select
  to authenticated
  using (public.can_view_prayer_request(prayer_id, auth.uid()));

drop policy if exists "Users can create own prayer interactions" on public.prayer_interactions;
create policy "Users can create own prayer interactions"
  on public.prayer_interactions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.can_view_prayer_request(prayer_id, auth.uid())
  );

drop policy if exists "Users can save prayers" on public.saved_prayers;
create policy "Users can save prayers"
  on public.saved_prayers for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.can_view_prayer_request(prayer_id, auth.uid())
  );

create or replace function public.get_map_hotspot_totals()
returns table (
  location_city text,
  location_country text,
  location_lat double precision,
  location_lng double precision,
  request_count integer,
  prayer_count integer,
  latest_created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with prepared as (
    select
      pr.location_city,
      pr.location_country,
      pr.location_lat,
      pr.location_lng,
      greatest(pr.prayer_count, 0) as prayer_count,
      pr.created_at,
      trim(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(lower(coalesce(pr.location_city, 'Unknown')), '&', ' and ', 'g'),
              '[.'',-]',
              ' ',
              'g'
            ),
            '\s+',
            ' ',
            'g'
          ),
          '^(city of |london borough of |royal borough of )',
          ''
        )
      ) as city_key,
      trim(
        regexp_replace(
          regexp_replace(
            regexp_replace(lower(coalesce(pr.location_country, 'Unknown')), '[.'',-]', ' ', 'g'),
            '\s+',
            ' ',
            'g'
          ),
          '^(the )',
          ''
        )
      ) as country_key
    from public.prayer_requests pr
    where pr.audience = 'public'
      and pr.location_lat is not null
      and pr.location_lng is not null
  ),
  normalized_country as (
    select
      *,
      case
        when country_key in (
          'uk',
          'u k',
          'united kingdom',
          'great britain',
          'britain',
          'england',
          'scotland',
          'wales',
          'northern ireland'
        ) then 'United Kingdom'
        when country_key in (
          'us',
          'usa',
          'u s',
          'u s a',
          'united states',
          'united states of america'
        ) then 'United States'
        else coalesce(nullif(trim(location_country), ''), 'Unknown')
      end as canonical_country
    from prepared
  ),
  normalized_location as (
    select
      case
        when canonical_country = 'United Kingdom'
          and city_key in (
            'london',
            'greater london',
            'city of london',
            'barking and dagenham',
            'barnet',
            'bexley',
            'brent',
            'bromley',
            'camden',
            'croydon',
            'ealing',
            'enfield',
            'greenwich',
            'hackney',
            'hammersmith and fulham',
            'haringey',
            'harrow',
            'havering',
            'hillingdon',
            'hounslow',
            'islington',
            'kensington and chelsea',
            'kingston upon thames',
            'lambeth',
            'lewisham',
            'merton',
            'newham',
            'redbridge',
            'richmond upon thames',
            'southwark',
            'sutton',
            'tower hamlets',
            'waltham forest',
            'wandsworth',
            'westminster'
          ) then 'London'
        else coalesce(nullif(trim(location_city), ''), 'Unknown')
      end as canonical_city,
      canonical_country,
      location_lat,
      location_lng,
      prayer_count,
      created_at
    from normalized_country
  )
  select
    canonical_city as location_city,
    canonical_country as location_country,
    avg(location_lat)::double precision as location_lat,
    avg(location_lng)::double precision as location_lng,
    count(*)::integer as request_count,
    coalesce(sum(prayer_count), 0)::integer as prayer_count,
    max(created_at) as latest_created_at
  from normalized_location
  group by canonical_city, canonical_country
  order by latest_created_at desc;
$$;

revoke all on function public.get_map_hotspot_totals()
  from public;

grant execute on function public.get_map_hotspot_totals()
  to authenticated;
