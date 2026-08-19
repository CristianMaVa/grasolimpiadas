-- ============================================================
-- GRASOLIMPIADAS · Esquema base (Fase 1)
-- Postgres / Supabase
-- Auth: selección de perfil sin contraseña (honor system)
-- ============================================================

-- Limpieza opcional para reejecución en desarrollo
-- (comenta estas líneas en producción)
drop table if exists evidence cascade;
drop table if exists entry_items cascade;
drop table if exists daily_entries cascade;
drop table if exists rules cascade;
drop table if exists users cascade;

-- ------------------------------------------------------------
-- USERS · participantes del reto
-- soft-delete vía columna "activo" para no perder historial
-- ------------------------------------------------------------
create table users (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null,
  avatar_url          text,
  comodines_restantes smallint not null default 2 check (comodines_restantes >= 0),
  activo              boolean not null default true,
  created_at          timestamptz not null default now()
);

comment on table users is 'Participantes del reto. Se desactivan con activo=false, nunca se borran.';

-- ------------------------------------------------------------
-- RULES · catálogo configurable del sistema de puntos
-- Evita hardcodear puntos en el frontend.
-- tipo: suma | resta | especial
-- ------------------------------------------------------------
create table rules (
  regla_key   text primary key,
  categoria   text not null,
  descripcion text not null,
  puntos      smallint not null,
  tipo        text not null check (tipo in ('suma','resta','especial')),
  -- las reglas "especial" se aplican por umbral automático (job),
  -- no las marca el usuario manualmente en el checklist
  automatica  boolean not null default false,
  orden       smallint not null default 0
);

comment on table rules is 'Catálogo de reglas de puntaje. Configurable sin tocar código.';
comment on column rules.automatica is 'true = la aplica un job por umbral (no aparece en el checklist manual).';

-- ------------------------------------------------------------
-- DAILY_ENTRIES · un registro por usuario por día
-- puntos_netos se recalcula desde entry_items + especiales
-- ------------------------------------------------------------
create table daily_entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  fecha              date not null,
  puntos_netos       smallint not null default 0,
  comida_libre_usada boolean not null default false,
  comodin_usado      boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, fecha)
);

comment on table daily_entries is 'Un registro por usuario por día. puntos_netos es el resultado del motor de puntos.';
comment on column daily_entries.comodin_usado is 'Si true, el día queda en 0 (aplicable retroactivamente).';

-- ------------------------------------------------------------
-- ENTRY_ITEMS · cada acción marcada en un día
-- Guarda el puntaje "congelado" al momento de marcar,
-- referenciando la regla del catálogo.
-- ------------------------------------------------------------
create table entry_items (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references daily_entries(id) on delete cascade,
  regla_key  text not null references rules(regla_key),
  categoria  text not null,
  puntos     smallint not null,
  created_at timestamptz not null default now()
);

comment on table entry_items is 'Ítems marcados por el usuario en un día. puntos se copia de la regla al marcar.';

-- ------------------------------------------------------------
-- EVIDENCE · fotos opcionales (honor system, no bloquea)
-- ------------------------------------------------------------
create table evidence (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references daily_entries(id) on delete cascade,
  regla_key  text references rules(regla_key),
  foto_url   text not null,
  created_at timestamptz not null default now()
);

comment on table evidence is 'Fotos de evidencia opcionales. No bloquean ni requieren aprobación.';

-- ------------------------------------------------------------
-- Índices útiles
-- ------------------------------------------------------------
create index idx_daily_entries_user   on daily_entries(user_id);
create index idx_daily_entries_fecha  on daily_entries(fecha);
create index idx_entry_items_entry    on entry_items(entry_id);
create index idx_evidence_entry       on evidence(entry_id);

-- ------------------------------------------------------------
-- Trigger: mantener updated_at en daily_entries
-- ------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_daily_entries_touch
  before update on daily_entries
  for each row execute function touch_updated_at();
