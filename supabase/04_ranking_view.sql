-- ============================================================
-- GRASOLIMPIADAS · Vista de ranking (Fase 3)
-- Ranking del TOTAL del reto (no semanal) — decisión del dueño.
-- Suma puntos_netos de todos los daily_entries por usuario activo.
-- Desempate: puntos_totales_sin_limite (mismo cálculo sin el cap de
-- +15/día) — los empates en puntos_totales son normales dado el cap,
-- y esta segunda suma sí distingue a quién le fue mejor en realidad.
-- ============================================================

drop view if exists v_ranking;

create view v_ranking as
select
  u.id as user_id,
  u.nombre,
  u.avatar_url,
  coalesce(sum(de.puntos_netos), 0) as puntos_totales,
  coalesce(sum(de.puntos_netos_sin_limite), 0) as puntos_totales_sin_limite,
  count(de.id) as dias_registrados
from users u
left join daily_entries de on de.user_id = u.id
where u.activo = true
group by u.id, u.nombre, u.avatar_url
order by puntos_totales desc, puntos_totales_sin_limite desc, u.nombre asc;

comment on view v_ranking is 'Ranking público: total acumulado del reto por usuario activo, desempatado por puntos_totales_sin_limite.';
