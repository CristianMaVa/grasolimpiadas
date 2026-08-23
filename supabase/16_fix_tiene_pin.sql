-- ============================================================
-- GRASOLIMPIADAS · Corrige la detección de "¿tiene PIN?" (fix real)
-- listActiveUsers() a propósito NO trae la columna `pin` (para no
-- exponer todos los PIN con solo cargar la pantalla de selección de
-- perfil) — pero eso significa que el cliente nunca puede saber si
-- un usuario tiene PIN asignado leyendo esa columna directamente.
-- Se agrega una columna generada `tiene_pin` (booleano derivado de
-- `pin is not null`) que SÍ se puede exponer sin revelar el valor.
-- ============================================================

alter table users
  add column if not exists tiene_pin boolean generated always as (pin is not null) stored;

comment on column users.tiene_pin is 'true si el usuario ya tiene un PIN asignado (sin revelar su valor) — se usa en ProfileSelect.jsx para decidir si pedirlo.';
