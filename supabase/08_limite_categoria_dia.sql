-- ============================================================
-- GRASOLIMPIADAS · Límite por categoría (ajuste post-deploy)
-- Bienestar (meditar / sin pantallas) pasa a máx 1 registro por
-- día ENTRE las dos — no se pueden sumar puntos por ambas el
-- mismo día. Configurable por categoría vía la columna nueva
-- `limite_categoria_dia`; null = sin límite de categoría (solo
-- aplica el límite de 1x por regla que ya existía).
-- ============================================================

alter table rules
  add column if not exists limite_categoria_dia smallint;

comment on column rules.limite_categoria_dia is
  'Máximo de items marcados por día compartido entre todas las reglas de esta categoría. Null = sin límite de categoría.';

update rules
set limite_categoria_dia = 1
where regla_key in ('bien_mente', 'bien_sin_pantallas');
