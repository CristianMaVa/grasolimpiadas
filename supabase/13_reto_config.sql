-- ============================================================
-- GRASOLIMPIADAS · Fechas de inicio/fin del reto (ajuste post-deploy)
-- Fila única (id=1) editable desde "Gestionar Reto". Se usa para
-- limitar el selector de fecha de "Hoy" (no se puede registrar antes
-- del inicio ni después del fin del reto) y para el letrero de días
-- restantes en la pantalla de selección de perfil. Si la tabla está
-- vacía, la app no restringe fechas ni muestra el letrero — mismo
-- comportamiento que antes de este ajuste.
-- ============================================================

create table if not exists reto_config (
  id smallint primary key default 1,
  fecha_inicio date not null,
  fecha_fin date not null,
  constraint reto_config_singleton check (id = 1),
  constraint reto_config_rango check (fecha_inicio <= fecha_fin)
);

comment on table reto_config is 'Fila única (id=1) con las fechas de inicio/fin del reto vigente. Editable desde el módulo administrativo "Gestionar Reto". Vacía = sin restricción de fechas.';
