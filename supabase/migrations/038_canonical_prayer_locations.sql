-- Keep stored location names aligned with the canonical names used by the
-- application and hotspot RPC. Location drill-down can then use indexed,
-- exact matches instead of downloading the public feed for client filtering.

update public.prayer_requests
set
  location_city = 'London',
  location_country = 'United Kingdom'
where lower(trim(location_city)) in (
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
)
and lower(trim(location_country)) in (
  'uk',
  'u k',
  'united kingdom',
  'great britain',
  'britain',
  'england',
  'scotland',
  'wales',
  'northern ireland'
);

update public.prayer_requests
set location_country = 'United Kingdom'
where lower(trim(location_country)) in (
  'uk',
  'u k',
  'great britain',
  'britain',
  'england',
  'scotland',
  'wales',
  'northern ireland'
);

update public.prayer_requests
set location_country = 'United States'
where lower(trim(location_country)) in (
  'us',
  'usa',
  'u s',
  'u s a',
  'united states of america'
);

create index if not exists prayer_requests_public_location_created_idx
  on public.prayer_requests (location_city, location_country, created_at desc)
  where audience = 'public';
