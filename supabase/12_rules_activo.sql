-- ============================================================
-- GRASOLIMPIADAS · Módulo administrativo: activar/desactivar y
-- crear actividades (ajuste post-deploy)
-- Nueva columna rules.activo (soft-toggle, no borra reglas para
-- no perder el historial de entry_items que ya las usaron). Solo
-- afecta qué aparece en el checklist/selector de registro diario
-- — los días pasados siguen mostrando lo que se marcó, sin
-- importar si esa regla hoy está activa o no.
-- ============================================================

alter table rules
  add column if not exists activo boolean not null default true;

comment on column rules.activo is
  'false = oculta la regla del checklist de registro diario sin borrar su historial. Se gestiona desde el módulo administrativo (PIN).';
