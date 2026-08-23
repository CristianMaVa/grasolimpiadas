-- ============================================================
-- GRASOLIMPIADAS · Feed: no marcar "registro tardío" si ese día ya
-- se aplicó la penalidad "No registré el día" (ajuste post-deploy).
--
-- Escenario: alguien no registra un día y se autopenaliza con la
-- regla esp_no_registrar (honor system, §4). Después, desde "¿se te
-- olvidó un día?" (History.jsx), decide llenar retroactivamente el
-- checklist real de ese mismo día. Eso crea entry_items con
-- created_at posterior a la fecha que registran → antes, la vista
-- los marcaba como "registro_tardío" en el feed de comportamiento
-- sospechoso. Pero si ya se pagó el costo en puntos por no haber
-- registrado a tiempo, señalarlo TAMBIÉN como sospechoso es un doble
-- castigo injusto — el dueño pidió que la alerta esté atada a esta
-- lógica y no se dispare en ese caso.
--
-- Redefine v_comportamiento_sospechoso (mismo patrón que
-- 10_puntos_sin_limite.sql con v_ranking: drop + create en una nueva
-- migración, nunca se edita el archivo ya corrido). Debe correrse
-- también en instalaciones nuevas, como 17_comportamiento_sospechoso.sql.
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
  );

comment on view v_comportamiento_sospechoso is 'Feed de comportamiento sospechoso: eliminaciones registradas + registros tardíos calculados al vuelo (fecha real de guardado, hora Colombia, distinta a la fecha que registra), excluyendo el día completo si ya se aplicó la penalidad esp_no_registrar en él (ya se pagó el costo en puntos). Visible para todos los participantes, no solo admin.';
