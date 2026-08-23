-- ============================================================
-- GRASOLIMPIADAS · Feed de comportamiento sospechoso (ajuste post-deploy)
-- Sección visible para TODOS los participantes (transparencia,
-- "controles internos" del dueño con espíritu de honor system) — no
-- es un panel de admin, es una pestaña más como Hoy/Ranking/Historial.
--
-- Dos tipos de "publicación" en el feed:
-- 1. Eliminaciones: se registran a partir de AHORA en la tabla
--    eliminaciones_registradas (ver eliminarActividad en
--    entriesApi.js). No hay forma de recuperar eliminaciones de
--    ANTES de esta migración — ya se habían borrado sin dejar rastro.
-- 2. Registros tardíos: NO se guardan aparte — se calculan al vuelo
--    comparando la fecha real en que se guardó cada entry_item
--    (created_at, convertido a hora de Colombia) contra la fecha del
--    día que registra (daily_entries.fecha). Cualquier diferencia
--    cuenta, sin importar cuántos días — esto SÍ cubre datos viejos,
--    desde el inicio del reto (decisión confirmada con el dueño).
-- ============================================================

create table if not exists eliminaciones_registradas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  regla_key text references rules(regla_key),
  descripcion_regla text not null,
  puntos smallint not null,
  fecha_actividad date not null,
  created_at timestamptz not null default now()
);

comment on table eliminaciones_registradas is 'Registro de actividades eliminadas por su dueño (ver eliminarActividad en entriesApi.js), para el feed de comportamiento sospechoso. Solo captura eliminaciones desde que existe esta tabla.';

-- drop + create (no "or replace") porque esta migración puede
-- correrse tanto en instalaciones nuevas como existentes; mismo
-- patrón que 04_ranking_view.sql.
drop view if exists v_comportamiento_sospechoso;

create view v_comportamiento_sospechoso as
select
  'eliminacion' as tipo,
  e.id,
  e.user_id,
  u.nombre,
  u.avatar_url,
  e.descripcion_regla,
  e.puntos,
  e.fecha_actividad,
  e.created_at as ocurrido_en
from eliminaciones_registradas e
join users u on u.id = e.user_id

union all

select
  'registro_tardio' as tipo,
  ei.id,
  de.user_id,
  u.nombre,
  u.avatar_url,
  r.descripcion as descripcion_regla,
  ei.puntos,
  de.fecha as fecha_actividad,
  ei.created_at as ocurrido_en
from entry_items ei
join daily_entries de on de.id = ei.entry_id
join users u on u.id = de.user_id
join rules r on r.regla_key = ei.regla_key
where (ei.created_at at time zone 'America/Bogota')::date <> de.fecha;

comment on view v_comportamiento_sospechoso is 'Feed de comportamiento sospechoso: eliminaciones registradas + registros tardíos calculados al vuelo (fecha real de guardado, hora Colombia, distinta a la fecha que registra). Visible para todos los participantes, no solo admin.';
