-- Private audio storage for Rhetor MVP
-- Path contract: rhetor-audio/<user_id>/<session_id>.<ext>

-- Create (or keep) a private bucket for session audio
insert into storage.buckets (id, name, public)
values ('rhetor-audio', 'rhetor-audio', false)
on conflict (id) do update
set public = excluded.public;

-- Users can upload only into their own top-level folder: <auth.uid()>/...
create policy "rhetor_audio_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'rhetor-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read only their own files in rhetor-audio.
create policy "rhetor_audio_select_own_folder"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'rhetor-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update only their own files in rhetor-audio.
create policy "rhetor_audio_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'rhetor-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'rhetor-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete only their own files in rhetor-audio.
create policy "rhetor_audio_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'rhetor-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

