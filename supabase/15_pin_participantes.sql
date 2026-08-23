-- ============================================================
-- GRASOLIMPIADAS · PIN por perfil (ajuste post-deploy)
-- Cada participante puede protegerse con un PIN de 4 dígitos al
-- elegir su perfil. Controlado desde "Gestionar Reto":
-- - Interruptor GLOBAL (pin_config.habilitado): si es false, nadie
--   pide PIN, sin importar el interruptor de cada usuario.
-- - Interruptor por USUARIO (users.pin_habilitado): si el global
--   está en true, solo piden PIN los usuarios con esto en true.
-- Ambos deben estar en true para que a un usuario le pidan PIN.
-- Mismo modelo de honor system que el resto de la app (ver §9) — el
-- PIN se valida contra la tabla vía la anon key, no hay backend ni
-- auth real. Disuade errores/curiosidad, no es seguridad real.
-- ============================================================

alter table users
  add column if not exists pin text,
  add column if not exists pin_habilitado boolean not null default true;

comment on column users.pin is 'PIN de 4 dígitos para proteger el acceso al perfil. Null = sin PIN asignado todavía (no se pide, aunque esté habilitado).';
comment on column users.pin_habilitado is 'Si es false, este usuario no pide PIN aunque el interruptor global (pin_config.habilitado) esté activo.';

create table if not exists pin_config (
  id smallint primary key default 1,
  habilitado boolean not null default false,
  constraint pin_config_singleton check (id = 1)
);

comment on table pin_config is 'Fila única (id=1): interruptor global del PIN por perfil. false = nadie pide PIN. Editable desde "Gestionar Reto".';
