-- Aggregate map totals by broad prayer location so hotspot counts stay accurate
-- without loading every individual prayer request into the client.

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
              '[.''’,-]',
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
            regexp_replace(lower(coalesce(pr.location_country, 'Unknown')), '[.''’,-]', ' ', 'g'),
            '\s+',
            ' ',
            'g'
          ),
          '^(the )',
          ''
        )
      ) as country_key
    from public.prayer_requests pr
    where pr.location_lat is not null
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
