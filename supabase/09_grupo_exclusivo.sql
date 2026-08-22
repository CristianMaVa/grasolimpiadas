-- ============================================================
-- GRASOLIMPIADAS · Grupos mutuamente excluyentes (ajuste post-deploy)
-- Algunas reglas son "buckets" de la misma medida y no se pueden
-- registrar dos a la vez el mismo día: agua (+2L / 1-2L / <1L),
-- horas de sueño (7-8h / 6h / <5h), tragos (1-2 / 3+). A diferencia
-- de `limite_categoria_dia`, esto cruza categorías (agua está en
-- Hidratación Y Hábitos) — por eso es una etiqueta libre, no ligada
-- a la categoría.
-- ============================================================

alter table rules
  add column if not exists grupo_exclusivo text;

comment on column rules.grupo_exclusivo is
  'Etiqueta libre: máx 1 registro por día entre todas las reglas que comparten la misma etiqueta, sin importar su categoría. Null = no pertenece a ningún grupo exclusivo.';

update rules set grupo_exclusivo = 'agua'
where regla_key in ('hidra_2l', 'hidra_1a2l', 'rest_agua_menos1l');

update rules set grupo_exclusivo = 'sueno_horas'
where regla_key in ('sueno_7a8', 'sueno_6', 'rest_dormir_menos5');

update rules set grupo_exclusivo = 'tragos'
where regla_key in ('rest_alcohol_1a2', 'rest_alcohol_3mas');
