-- ============================================================
-- GRASOLIMPIADAS · Comodín por actividad, no por día (ajuste post-deploy)
-- Antes: `daily_entries.comodin_usado` ponía el neto del día ENTERO en
-- 0, sin importar qué se hubiera marcado (ni distinguía sumas de
-- restas). Ahora el comodín neutraliza UNA actividad penalizante
-- puntual, elegida por el usuario entre las restas ya marcadas ese
-- día — el resto del día (incluidas las sumas) se sigue calculando
-- normal. `daily_entries.comodin_usado` pasa a ser un flag DERIVADO
-- (true si algún entry_item de ese día tiene comodin_aplicado=true),
-- recalculado en cada `recalcularNeto()` — se conserva para no romper
-- la etiqueta "Comodín" que ya usan History.jsx/DayDetail.jsx a nivel
-- de día.
-- ============================================================

alter table entry_items
  add column if not exists comodin_aplicado boolean not null default false;

comment on column entry_items.comodin_aplicado is
  'true si el comodín neutralizó esta actividad puntual (solo aplica a restas). Sus puntos originales se conservan en `puntos` para el historial, pero no se suman al neto del día.';

-- Backfill: los días que ya tenían el comodín "de día completo" (viejo
-- modelo) marcaban el neto en 0 sin importar el signo de cada item. Para
-- no alterar el histórico ya guardado, se replica ese mismo efecto
-- marcando comodin_aplicado=true en TODOS los entry_items de esos días
-- (sumas y restas) — con el nuevo pointsEngine (que excluye del cálculo
-- cualquier item con comodin_aplicado=true, sin importar el signo) el
-- neto sigue dando 0, igual que antes. Si más adelante se agrega/edita
-- un item en uno de estos días, ese item nuevo SÍ contará (comportamiento
-- correcto y consistente con el nuevo modelo, que es por actividad).
update entry_items ei
set comodin_aplicado = true
from daily_entries de
where de.id = ei.entry_id
  and de.comodin_usado = true
  and ei.comodin_aplicado = false;
