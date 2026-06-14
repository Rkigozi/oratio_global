-- 1. Saved prayers table
create table if not exists public.saved_prayers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prayer_id uuid not null references public.prayer_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, prayer_id)
);

create index idx_saved_prayers_user on public.saved_prayers(user_id);
create index idx_saved_prayers_prayer on public.saved_prayers(prayer_id);

alter table public.saved_prayers enable row level security;

create policy "Users can view own saved prayers"
  on public.saved_prayers for select
  using (auth.uid() = user_id);

create policy "Users can save prayers"
  on public.saved_prayers for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave prayers"
  on public.saved_prayers for delete
  using (auth.uid() = user_id);
