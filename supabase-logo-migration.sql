-- Run this once in Supabase SQL Editor for an existing deployment.
-- The base supabase-schema.sql already contains these rules for new projects.

alter table public.teams add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do update set public = true;

drop policy if exists "public can read team logos" on storage.objects;
drop policy if exists "admins can upload team logos" on storage.objects;
drop policy if exists "admins can update team logos" on storage.objects;
drop policy if exists "admins can delete team logos" on storage.objects;

create policy "public can read team logos" on storage.objects
  for select using (bucket_id = 'team-logos');
create policy "admins can upload team logos" on storage.objects
  for insert with check (bucket_id = 'team-logos' and public.is_admin());
create policy "admins can update team logos" on storage.objects
  for update using (bucket_id = 'team-logos' and public.is_admin())
  with check (bucket_id = 'team-logos' and public.is_admin());
create policy "admins can delete team logos" on storage.objects
  for delete using (bucket_id = 'team-logos' and public.is_admin());
