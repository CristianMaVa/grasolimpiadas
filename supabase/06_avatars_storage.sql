-- ============================================================
-- GRASOLIMPIADAS · Storage para fotos de perfil de participantes
-- Mismo criterio que el bucket "evidence": acceso abierto con la
-- anon key, pensado para un grupo cerrado. `users.avatar_url` ya
-- existía en el esquema — esto solo agrega dónde guardar el archivo.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_anon_insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars');
