-- ============================================================
-- GRASOLIMPIADAS · Desempate de ranking sin el cap de +15/día
-- (ajuste post-deploy)
-- El cap de +15 pts/día a los positivos hace que los empates en el
-- ranking sean normales — dos personas pueden tener el mismo total
-- "con cap" aunque una haya hecho muchas más actividades ese día.
-- Se agrega puntos_netos_sin_limite (mismo cálculo, sin el cap) para
-- desempatar: el ranking sigue ordenando primero por el total CON
-- límite, y solo usa el total SIN límite para romper empates.
-- ============================================================

alter table daily_entries
  add column if not exists puntos_netos_sin_limite smallint not null default 0;

comment on column daily_entries.puntos_netos_sin_limite is
  'Igual que puntos_netos pero sin el cap de +15/día — solo se usa para desempatar el ranking.';

-- Backfill: recalcula puntos_netos_sin_limite para TODOS los días ya
-- guardados, replicando exactamente la lógica de calcularNetoSinLimite
-- (comodín → 0; comida libre → exime restas de Alimentación; sin cap).
update daily_entries de
set puntos_netos_sin_limite = case
  when de.comodin_usado then 0
  else coalesce((
    select sum(ei.puntos)
    from entry_items ei
    where ei.entry_id = de.id
      and not (de.comida_libre_usada and ei.categoria = 'Alimentación' and ei.puntos < 0)
  ), 0)
end;

-- Vista de ranking: agrega la columna de desempate y la usa en el orden.
-- drop + create (no "or replace") porque la columna nueva queda en medio
-- de las existentes — Postgres no permite renombrar/reordenar columnas
-- de una vista con CREATE OR REPLACE, solo agregarlas al final.
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
