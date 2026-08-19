-- ============================================================
-- GRASOLIMPIADAS · Penalidades manuales (ajuste post-Fase 3)
-- Decisión del dueño: las tres penalidades que iban a ser
-- automáticas por umbral/job ("día perdido", "fin de semana
-- destructivo" y "no registrar el día") pasan a ser honor
-- system, como el resto del checklist — el usuario las marca si
-- siente que aplicaron. Viven en la categoría nueva
-- "Penalidades", junto a Actividad, Disciplina, Hábitos, etc.
-- No hay jobs ni pg_cron en este proyecto.
--
-- Se mantiene el regla_key original (esp_*) para no romper el FK
-- de entry_items — es solo un prefijo histórico, ya no implica
-- "automática".
-- ============================================================

update rules
set categoria = 'Penalidades', descripcion = 'Día perdido', tipo = 'resta', automatica = false, orden = 160
where regla_key = 'esp_dia_perdido';

update rules
set categoria = 'Penalidades', descripcion = 'Fin de semana destructivo', tipo = 'resta', automatica = false, orden = 161
where regla_key = 'esp_finde_destructivo';

update rules
set categoria = 'Penalidades', descripcion = 'No registré el día', tipo = 'resta', automatica = false, orden = 162
where regla_key = 'esp_no_registrar';
