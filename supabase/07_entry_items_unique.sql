-- ============================================================
-- GRASOLIMPIADAS · Una regla, máximo una vez por día (Fase 2 ajuste)
-- El registro diario pasó de "marcar todo y guardar" a un modelo
-- incremental: se registra una actividad a la vez y se guarda al
-- toque. Esta constraint es el resguardo real contra registrar la
-- misma regla dos veces el mismo día (el frontend ya la deshabilita
-- en el selector, pero esto lo garantiza a nivel de datos).
--
-- Si esto falla con "could not create unique index" es porque ya
-- hay duplicados (entry_id, regla_key) de pruebas anteriores —
-- hay que limpiarlos primero.
-- ============================================================

alter table entry_items
  add constraint entry_items_entry_regla_key
  unique (entry_id, regla_key);
