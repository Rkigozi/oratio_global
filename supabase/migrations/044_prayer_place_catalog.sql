-- A public, read-only city catalog. Prayer locations are assigned by the server,
-- never from device coordinates supplied by a client. Data follows in 045.
create function public.prayer_location_key(value text)
returns text language sql immutable strict set search_path = public as $$
  select trim(regexp_replace(regexp_replace(replace(replace(
    lower(regexp_replace(normalize(value, NFD), U&'[\0300-\036f]', '', 'g')),
    '&', ' and '), chr(8217), ''), '[.'',-]', ' ', 'g'), '\s+', ' ', 'g'));
$$;

create table public.prayer_places (
  id text primary key check (id ~ '^geonames:[0-9]+$'),
  city text not null check (length(city) between 1 and 200),
  region text not null default '',
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  country text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  population bigint not null default 0 check (population >= 0),
  search_text text not null,
  search_document tsvector generated always as (to_tsvector('simple', search_text)) stored,
  unique (id, country_code)
);
create index prayer_places_search_idx on public.prayer_places using gin(search_document);
create index prayer_places_country_idx on public.prayer_places(country_code);
create index prayer_places_country_name_idx on public.prayer_places(public.prayer_location_key(country));

create table public.prayer_place_aliases (
  place_id text not null,
  country_code text not null,
  alias_key text not null check (length(alias_key) between 1 and 200),
  primary key (place_id, alias_key),
  foreign key (place_id, country_code) references public.prayer_places(id, country_code)
);
create index prayer_place_alias_lookup_idx
  on public.prayer_place_aliases(country_code, alias_key, place_id);
alter table public.prayer_places enable row level security;
alter table public.prayer_place_aliases enable row level security;
revoke all on public.prayer_places, public.prayer_place_aliases from public, anon, authenticated;
grant select on public.prayer_places, public.prayer_place_aliases to authenticated;
create policy "Signed-in users can read the place catalog" on public.prayer_places
  for select to authenticated using (auth.uid() is not null);
create policy "Signed-in users can read place aliases" on public.prayer_place_aliases
  for select to authenticated using (auth.uid() is not null);

create function public.prayer_country_code(value text)
returns text language sql stable set search_path = public as $$
  select case public.prayer_location_key(value)
    when 'uk' then 'GB' when 'u k' then 'GB' when 'great britain' then 'GB'
    when 'britain' then 'GB' when 'england' then 'GB' when 'scotland' then 'GB'
    when 'wales' then 'GB' when 'northern ireland' then 'GB'
    when 'us' then 'US' when 'usa' then 'US' when 'u s' then 'US' when 'u s a' then 'US'
    when 'united states of america' then 'US' when 'uae' then 'AE'
    else (select min(p.country_code) from public.prayer_places p
      where p.country_code = upper(trim(value))
        or public.prayer_location_key(p.country) = public.prayer_location_key(value))
  end;
$$;

create function public.resolve_prayer_place_id(p_city text, p_country text)
returns text language sql stable set search_path = public as $$
  select case when count(distinct a.place_id) = 1 then min(a.place_id) end
  from public.prayer_place_aliases a
  where length(p_city) between 1 and 200 and length(p_country) between 1 and 200
    and a.country_code = public.prayer_country_code(p_country)
    and a.alias_key = public.prayer_location_key(p_city);
$$;

create function public.search_prayer_places(p_query text)
returns table (id text, city text, region text, country_code text, country text,
  latitude double precision, longitude double precision)
language sql stable security invoker set search_path = public as $$
  with words as (
    select word from regexp_split_to_table(public.prayer_location_key(p_query), '\s+') word
    where length(p_query) between 2 and 80 and length(word) > 0
  ), query as (
    select to_tsquery('simple', string_agg(quote_literal(word) || ':*', ' & ')) q from words
  )
  select p.id, p.city, p.region, p.country_code, p.country, p.latitude, p.longitude
  from public.prayer_places p cross join query
  where auth.uid() is not null and p.search_document @@ query.q
  order by (public.prayer_location_key(p.city) = public.prayer_location_key(p_query)) desc,
    p.population desc, p.city, p.country_code, p.region, p.id
  limit 12;
$$;

create function public.find_prayer_place(p_city text, p_country text)
returns table (id text, city text, region text, country_code text, country text,
  latitude double precision, longitude double precision)
language sql stable security invoker set search_path = public as $$
  select p.id, p.city, p.region, p.country_code, p.country, p.latitude, p.longitude
  from public.prayer_places p
  where auth.uid() is not null and p.id = public.resolve_prayer_place_id(p_city, p_country);
$$;

revoke all on function public.prayer_location_key(text), public.prayer_country_code(text),
  public.resolve_prayer_place_id(text, text), public.search_prayer_places(text),
  public.find_prayer_place(text, text) from public, anon;
grant execute on function public.prayer_location_key(text), public.prayer_country_code(text),
  public.resolve_prayer_place_id(text, text), public.search_prayer_places(text),
  public.find_prayer_place(text, text) to authenticated;

alter table public.prayer_requests
  add column location_place_id text references public.prayer_places(id),
  add column location_country_code text;
create index prayer_requests_place_created_idx
  on public.prayer_requests(location_place_id, created_at desc, id desc)
  where audience = 'public';

create function public.set_prayer_place()
returns trigger language plpgsql security definer set search_path = public as $$
declare place public.prayer_places%rowtype;
begin
  if new.audience = 'private' then
    new.location_place_id := null;
    new.location_country_code := null;
    new.location_city := '';
    new.location_country := '';
    new.location_lat := null;
    new.location_lng := null;
    return new;
  end if;
  if new.location_place_id is null then
    new.location_place_id := public.resolve_prayer_place_id(new.location_city, new.location_country);
  end if;
  if new.location_place_id is not null then
    select * into place from public.prayer_places where id = new.location_place_id;
    if not found then
      raise exception 'Choose a recognized city or omit the location' using errcode = '22023';
    end if;
    new.location_city := place.city;
    new.location_country := place.country;
    new.location_country_code := place.country_code;
    new.location_lat := place.latitude;
    new.location_lng := place.longitude;
  else
    -- Keep legacy display names, but never preserve unverified coordinates.
    new.location_country_code := null;
    new.location_lat := null;
    new.location_lng := null;
  end if;
  return new;
end;
$$;
create trigger set_prayer_place before insert or update of location_place_id,
  location_city, location_country, location_lat, location_lng, location_country_code, audience
  on public.prayer_requests for each row execute function public.set_prayer_place();
revoke all on function public.set_prayer_place() from public, anon, authenticated;

drop function public.get_map_hotspot_totals();
create function public.get_map_hotspot_totals()
returns table (location_city text, location_country text, location_lat double precision,
  location_lng double precision, request_count integer, prayer_count integer,
  latest_created_at timestamptz, next_expires_at timestamptz,
  location_place_id text, location_country_code text)
language sql stable security invoker set search_path = public as $$
  with located as (
    select pr.id, pr.location_place_id, pr.created_at, pr.public_expires_at
    from public.prayer_requests pr
    where pr.audience = 'public' and pr.public_expires_at > now()
      and pr.location_place_id is not null
  ), totals as (
    select l.location_place_id, count(*)::integer requests,
      max(l.created_at) latest, min(l.public_expires_at) expiry
    from located l group by l.location_place_id
  ), people as (
    select l.location_place_id, count(distinct pi.user_id)::integer prayed
    from located l left join public.prayer_interactions pi on pi.prayer_id = l.id
    group by l.location_place_id
  )
  select p.city, p.country, p.latitude, p.longitude, t.requests, coalesce(u.prayed, 0),
    t.latest, t.expiry, p.id, p.country_code
  from totals t join public.prayer_places p on p.id = t.location_place_id
  left join people u on u.location_place_id = t.location_place_id
  order by t.latest desc, p.id;
$$;
revoke all on function public.get_map_hotspot_totals() from public, anon;
grant execute on function public.get_map_hotspot_totals() to authenticated;
notify pgrst, 'reload schema';
