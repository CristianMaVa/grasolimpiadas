-- ============================================================
-- GRASOLIMPIADAS · Vista de ranking (Fase 3)
-- Ranking del TOTAL del reto (no semanal) — decisión del dueño.
-- Suma puntos_netos de todos los daily_entries por usuario activo.
-- ============================================================

create or replace view v_ranking as
select
  u.id as user_id,
  u.nombre,
  u.avatar_url,
  coalesce(sum(de.puntos_netos), 0) as puntos_totales,
  count(de.id) as dias_registrados
from users u
left join daily_entries de on de.user_id = u.id
where u.activo = true
group by u.id, u.nombre, u.avatar_url
order by puntos_totales desc, u.nombre asc;

comment on view v_ranking is 'Ranking público: total acumulado del reto por usuario activo.';
