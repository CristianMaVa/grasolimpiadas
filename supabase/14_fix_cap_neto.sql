-- ============================================================
-- GRASOLIMPIADAS · Corrige el cap de +15/día (ajuste post-deploy)
-- El cap se aplicaba solo a los positivos ANTES de restar las restas
-- del día (min(positivos,15) + negativos), lo cual subestimaba el
-- neto en cualquier día con positivos > 15 y alguna resta — ejemplo
-- real: +17/-1 daba 14 en vez de 15. Corregido en pointsEngine.js
-- para aplicar el cap al NETO (positivos + negativos), sin piso.
--
-- Backfill: puntos_netos_sin_limite YA es exactamente positivos+
-- negativos (sin cap, ya excluye lo eximido por comida libre, y ya
-- es 0 en los días con comodín) — así que el puntos_netos corregido
-- es simplemente el mínimo entre esa columna y 15. No hace falta
-- volver a leer entry_items.
--
-- El bug SOLO podía subestimar el neto, nunca sobrestimarlo (ver
-- HANDOFF §3.5) — este backfill solo puede igualar o subir el total
-- de cada usuario en el ranking, nunca bajarlo.
-- ============================================================

update daily_entries
set puntos_netos = least(puntos_netos_sin_limite, 15)
where puntos_netos <> least(puntos_netos_sin_limite, 15);
