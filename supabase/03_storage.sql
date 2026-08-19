-- ============================================================
-- GRASOLIMPIADAS · Storage (Fase 2)
-- Bucket para las fotos de evidencia opcionales.
-- Igual que el resto del honor system: acceso abierto con la
-- anon key, pensado para un grupo cerrado. Ver HANDOFF §9 sobre
-- el riesgo de exponer la anon key públicamente.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

create policy "evidence_public_read"
  on storage.objects for select
  using (bucket_id = 'evidence');

create policy "evidence_anon_insert"
  on storage.objects for insert
  with check (bucket_id = 'evidence');
