-- Make the map's "people prayed" total count distinct people per location.
-- One person praying for several requests in the same place is counted once.

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
      pr.id as prayer_id,
      pr.location_city,
      pr.location_country,
      pr.location_lat,
      pr.location_lng,
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
      and not (pr.location_lat = 0 and pr.location_lng = 0)
      and lower(trim(coalesce(pr.location_city, ''))) not in ('', 'unknown')
      and lower(trim(coalesce(pr.location_country, ''))) not in ('', 'unknown')
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
      prayer_id,
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
      created_at
    from normalized_country
  ),
  request_totals as (
    select
      canonical_city,
      canonical_country,
      avg(location_lat)::double precision as location_lat,
      avg(location_lng)::double precision as location_lng,
      count(*)::integer as request_count,
      max(created_at) as latest_created_at
    from normalized_location
    where canonical_city <> 'Unknown'
      and canonical_country <> 'Unknown'
    group by canonical_city, canonical_country
  ),
  people_totals as (
    select
      nl.canonical_city,
      nl.canonical_country,
      count(distinct pi.user_id)::integer as prayer_count
    from normalized_location nl
    left join public.prayer_interactions pi
      on pi.prayer_id = nl.prayer_id
    where nl.canonical_city <> 'Unknown'
      and nl.canonical_country <> 'Unknown'
    group by nl.canonical_city, nl.canonical_country
  )
  select
    rt.canonical_city as location_city,
    rt.canonical_country as location_country,
    rt.location_lat,
    rt.location_lng,
    rt.request_count,
    coalesce(pt.prayer_count, 0)::integer as prayer_count,
    rt.latest_created_at
  from request_totals rt
  left join people_totals pt
    on pt.canonical_city = rt.canonical_city
    and pt.canonical_country = rt.canonical_country
  order by rt.latest_created_at desc;
$$;

revoke all on function public.get_map_hotspot_totals()
  from public;

grant execute on function public.get_map_hotspot_totals()
  to authenticated;
