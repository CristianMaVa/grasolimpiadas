-- ============================================================
-- GRASOLIMPIADAS · Feed: nuevo tipo de publicación "trasnocho no
-- declarado" (ajuste post-deploy, §3.23).
--
-- Regla de negocio (confirmada con el dueño): trasnochar solo se
-- "vale" gratis los viernes y sábados (fin de semana). De domingo a
-- jueves, si alguien registra actividades de su día después de las
-- 11pm (hora de Colombia) ese MISMO día, es evidencia de que se
-- trasnochó — y si ese día no incluye la penalidad manual
-- "Trasnochar sin motivo" (regla rest_trasnochar), están dejando de
-- marcarla. Ejemplo del dueño: es jueves, registra su día a las
-- 11:15pm → ya trasnochó ese jueves → si no marca la penalidad, es
-- tramposo.
--
-- Importante: esto es DISTINTO de "registro_tardio" (que compara la
-- fecha que se registra contra la fecha real de guardado). Acá la
-- fecha coincide (se registra el mismo día), lo sospechoso es la
-- HORA del check-in en un día de semana sin la penalidad.
--
-- Redefine v_comportamiento_sospechoso (mismo patrón que
-- 10_puntos_sin_limite.sql / 18_feed_excluye_no_registrar.sql: drop +
-- create en una nueva migración). Debe correrse también en
-- instalaciones nuevas, como 17 y 18.
-- ============================================================

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
where (ei.created_at at time zone 'America/Bogota')::date <> de.fecha
  and not exists (
    select 1 from entry_items ei2
    where ei2.entry_id = ei.entry_id
      and ei2.regla_key = 'esp_no_registrar'
  )

union all

-- Check-in después de las 11pm (hora Colombia), el mismo día que
-- registra, en noche de domingo(0) a jueves(4) — sin la penalidad
-- "Trasnochar sin motivo" (rest_trasnochar) en ese día. Un registro
-- por día (no uno por item): agrupa por daily_entry y toma la
-- primera hora que cruzó las 11pm como "ocurrido_en".
select
  'trasnocho_no_declarado' as tipo,
  de.id,
  de.user_id,
  u.nombre,
  u.avatar_url,
  'No marcó "Trasnochar sin motivo"' as descripcion_regla,
  null::smallint as puntos,
  de.fecha as fecha_actividad,
  min(ei.created_at) as ocurrido_en
from entry_items ei
join daily_entries de on de.id = ei.entry_id
join users u on u.id = de.user_id
where (ei.created_at at time zone 'America/Bogota')::date = de.fecha
  and (ei.created_at at time zone 'America/Bogota')::time >= time '23:00:00'
  and extract(dow from de.fecha) in (0, 1, 2, 3, 4)
  and not exists (
    select 1 from entry_items ei2
    where ei2.entry_id = de.id
      and ei2.regla_key = 'rest_trasnochar'
  )
group by de.id, de.user_id, u.nombre, u.avatar_url, de.fecha;

comment on view v_comportamiento_sospechoso is 'Feed de comportamiento sospechoso: eliminaciones registradas + registros tardíos (excluyendo días con esp_no_registrar) + check-ins pasadas las 11pm en noche de domingo a jueves sin la penalidad rest_trasnochar (§3.20, §3.22, §3.23). Visible para todos los participantes, no solo admin.';
