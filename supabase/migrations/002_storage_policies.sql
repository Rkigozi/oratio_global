-- Storage policies for avatars bucket
-- Required for profile photo upload to work

-- Ensure bucket exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, null)
on conflict (id) do nothing;

-- Allow anyone to view avatars
create policy "Anyone can view avatars"
on storage.objects for select
using (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
create policy "Authenticated users can upload avatars"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- Allow users to update their own avatars
create policy "Users can update own avatars"
on storage.objects for update
using (bucket_id = 'avatars' and auth.uid() = owner);

-- Allow users to delete their own avatars
create policy "Users can delete own avatars"
on storage.objects for delete
using (bucket_id = 'avatars' and auth.uid() = owner);
