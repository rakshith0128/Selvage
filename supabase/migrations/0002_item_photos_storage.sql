-- Item photos: public bucket, per-user write access.
-- Paths are unguessable: <user_id>/<uuid>.<ext>

insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

-- Writes are restricted to the caller's own folder (first path segment = auth.uid()).
create policy "Users upload own item photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own item photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own item photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public bucket serves files anonymously via the render endpoint; this also
-- allows reads through the storage API.
create policy "Anyone can view item photos" on storage.objects
  for select using (bucket_id = 'item-photos');
