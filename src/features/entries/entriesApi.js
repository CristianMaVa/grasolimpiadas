import { supabase } from '../../lib/supabase';
import { calcularNeto, calcularNetoSinLimite } from './pointsEngine';

// ============================================================
// CRUD de registro diario.
// Modelo incremental: cada actividad se registra y persiste al
// toque (no hay un botón único de "guardar todo el día"). Una
// regla se registra como máximo una vez por día — ver
// registrarActividad(). La comida libre es un flag de día
// completo que se guarda al toque; el comodín, en cambio, se
// aplica por actividad puntual — ver aplicarComodinAItem() /
// quitarComodinDeItem() y supabase/20_comodin_por_actividad.sql.
// ============================================================

function lunesDe(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00`);
  const dia = d.getDay(); // 0 = domingo
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d;
}

// Fecha local en formato YYYY-MM-DD. NUNCA usar d.toISOString() para esto:
// convierte a UTC, y con zonas horarias negativas (la mayoría de América)
// cerca de la medianoche local ya es el día siguiente en UTC — el día
// mostrado/registrado se adelantaba solo. Se toman los componentes de
// fecha locales del objeto Date, no su representación UTC.
function aISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Rango lunes–domingo de la semana que contiene `fechaISO`
export function semanaDe(fechaISO) {
  const lunes = lunesDe(fechaISO);
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  return { desde: aISO(lunes), hasta: aISO(domingo) };
}

// Devuelve el daily_entry de user+fecha, creándolo (en blanco) si no existe.
async function ensureEntry(userId, fecha) {
  const { data: existente, error: selError } = await supabase
    .from('daily_entries')
    .select('id, comida_libre_usada, comodin_usado')
    .eq('user_id', userId)
    .eq('fecha', fecha)
    .maybeSingle();
  if (selError) throw selError;
  if (existente) return existente;

  const { data: creado, error: insError } = await supabase
    .from('daily_entries')
    .insert({ user_id: userId, fecha })
    .select('id, comida_libre_usada, comodin_usado')
    .single();
  if (insError) throw insError;
  return creado;
}

// Recalcula puntos_netos (y su versión sin el cap de +15, solo para
// desempatar el ranking — ver v_ranking) desde TODOS los entry_items
// vigentes + los flags actuales del entry, y lo persiste. Se llama
// tras cada acción. También recalcula `comodin_usado` del entry como
// flag DERIVADO (true si algún item vigente tiene comodin_aplicado) —
// el comodín ya no es un interruptor de día completo (ver
// supabase/20_comodin_por_actividad.sql), pero se conserva esta
// columna para no romper la etiqueta "Comodín" del historial.
async function recalcularNeto(entryId) {
  const { data: entry, error: entryError } = await supabase
    .from('daily_entries')
    .select('comida_libre_usada')
    .eq('id', entryId)
    .single();
  if (entryError) throw entryError;

  const { data: items, error: itemsError } = await supabase
    .from('entry_items')
    .select('categoria, puntos, comodin_aplicado')
    .eq('entry_id', entryId);
  if (itemsError) throw itemsError;

  const opts = { comidaLibreUsada: entry.comida_libre_usada };
  const puntosNetos = calcularNeto(items, opts);
  const puntosNetosSinLimite = calcularNetoSinLimite(items, opts);
  const comodinUsado = items.some((i) => i.comodin_aplicado);

  const { error: updError } = await supabase
    .from('daily_entries')
    .update({ puntos_netos: puntosNetos, puntos_netos_sin_limite: puntosNetosSinLimite, comodin_usado: comodinUsado })
    .eq('id', entryId);
  if (updError) throw updError;

  return puntosNetos;
}

// Carga el entry (si existe) y las regla_key ya registradas — para
// saber qué actividades ya están hechas hoy y no ofrecerlas de nuevo.
// `comodinPorRegla` marca qué regla_key de hoy tiene el comodín
// aplicado (por item, ver §3.7 revisado) — lo usa DailyEntry.jsx para
// pintar el estado de cada actividad marcada.
export async function getEntryForDate(userId, fecha) {
  const { data: entry, error } = await supabase
    .from('daily_entries')
    .select('id, fecha, puntos_netos, comida_libre_usada, comodin_usado')
    .eq('user_id', userId)
    .eq('fecha', fecha)
    .maybeSingle();

  if (error) throw error;
  if (!entry) return { entry: null, reglaKeys: [], comodinPorRegla: {} };

  const { data: items, error: itemsError } = await supabase
    .from('entry_items')
    .select('regla_key, comodin_aplicado')
    .eq('entry_id', entry.id);
  if (itemsError) throw itemsError;

  const comodinPorRegla = {};
  for (const i of items) {
    if (i.comodin_aplicado) comodinPorRegla[i.regla_key] = true;
  }

  return { entry, reglaKeys: items.map((i) => i.regla_key), comodinPorRegla };
}

// Detalle de solo lectura de un día ya guardado: qué se marcó. Para
// el drill-down del historial. `comodinAplicado` por item indica si
// esa actividad puntual fue neutralizada por el comodín — sus puntos
// originales viajan igual en `puntos` (el historial no los borra),
// pero DayDetail.jsx los muestra en 0 con un subtítulo.
export async function getDayDetail(entryId) {
  const { data: items, error: itemsError } = await supabase
    .from('entry_items')
    .select('regla_key, categoria, puntos, comodin_aplicado, rules(descripcion)')
    .eq('entry_id', entryId);
  if (itemsError) throw itemsError;

  return items.map((i) => ({
    regla_key: i.regla_key,
    categoria: i.categoria,
    puntos: i.puntos,
    comodinAplicado: i.comodin_aplicado,
    descripcion: i.rules?.descripcion ?? i.regla_key,
  }));
}

// Cuántos OTROS días de la semana ya usaron la comida libre (máx 1/semana)
export async function countComidaLibreEnSemana(userId, fecha, excludeEntryId = null) {
  const { desde, hasta } = semanaDe(fecha);
  const { data, error } = await supabase
    .from('daily_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('comida_libre_usada', true)
    .gte('fecha', desde)
    .lte('fecha', hasta);

  if (error) throw error;
  return data.filter((e) => e.id !== excludeEntryId).length;
}

// Registra UNA actividad para user+fecha: crea el entry si no existía,
// inserta el entry_item, y recalcula el neto. Falla si la regla ya
// estaba registrada ese día (constraint única en entry_items) — el
// caller debe evitar ofrecerla de nuevo en el selector, pero esto es
// el resguardo real.
export async function registrarActividad({ userId, fecha, regla }) {
  const entry = await ensureEntry(userId, fecha);

  const { error: insError } = await supabase
    .from('entry_items')
    .insert({ entry_id: entry.id, regla_key: regla.regla_key, categoria: regla.categoria, puntos: regla.puntos });
  if (insError) throw insError;

  const puntosNetos = await recalcularNeto(entry.id);
  return { entryId: entry.id, puntosNetos };
}

// Registra VARIAS actividades de una sola vez para user+fecha (modo
// checklist): crea el entry si no existía, inserta todos los
// entry_items en un solo insert, y recalcula el neto una vez al final.
// Igual que registrarActividad, falla si alguna regla ya estaba
// registrada ese día (constraint única) — el caller no debe ofrecer
// como seleccionables las que ya están marcadas o en conflicto.
export async function registrarActividades({ userId, fecha, reglas }) {
  if (!reglas.length) return { entryId: null, puntosNetos: null };
  const entry = await ensureEntry(userId, fecha);

  const { error: insError } = await supabase
    .from('entry_items')
    .insert(reglas.map((r) => ({ entry_id: entry.id, regla_key: r.regla_key, categoria: r.categoria, puntos: r.puntos })));
  if (insError) throw insError;

  const puntosNetos = await recalcularNeto(entry.id);
  return { entryId: entry.id, puntosNetos };
}

// Elimina UN item ya registrado de un día (corrección manual, ej. se
// marcó algo por accidente) y recalcula el neto. No borra el entry en
// sí aunque quede sin items — solo lo vacía, para no perder los flags
// de comodín/comida libre si estaban activos ese día. Antes de borrar,
// deja constancia en `eliminaciones_registradas` (feed de
// comportamiento sospechoso, visible para todos — ver
// features/feed/). Es la única acción de la app con esta bitácora;
// nunca se puede recuperar una eliminación de antes de que existiera.
// Si el item borrado tenía el comodín aplicado, se le reembolsa al
// usuario (devuelto en `comodinesRestantes`, null si no aplicaba) —
// si no, el comodín quedaría consumido sin ninguna actividad que
// neutralizar.
export async function eliminarActividad({ entryId, reglaKey }) {
  const { data: entry, error: entryError } = await supabase
    .from('daily_entries')
    .select('user_id, fecha')
    .eq('id', entryId)
    .single();
  if (entryError) throw entryError;

  const { data: item, error: itemError } = await supabase
    .from('entry_items')
    .select('regla_key, puntos, comodin_aplicado, rules(descripcion)')
    .eq('entry_id', entryId)
    .eq('regla_key', reglaKey)
    .single();
  if (itemError) throw itemError;

  const { error: logError } = await supabase.from('eliminaciones_registradas').insert({
    user_id: entry.user_id,
    regla_key: item.regla_key,
    descripcion_regla: item.rules?.descripcion ?? item.regla_key,
    puntos: item.puntos,
    fecha_actividad: entry.fecha,
  });
  if (logError) throw logError;

  const { error } = await supabase
    .from('entry_items')
    .delete()
    .eq('entry_id', entryId)
    .eq('regla_key', reglaKey);
  if (error) throw error;

  let comodinesRestantes = null;
  if (item.comodin_aplicado) {
    const userActualizado = await ajustarComodines(entry.user_id, 1);
    comodinesRestantes = userActualizado.comodines_restantes;
  }

  const puntosNetos = await recalcularNeto(entryId);
  return { puntosNetos, comodinesRestantes };
}

// Aplica el comodín a UNA actividad puntual ya registrada ese día
// (revisado — antes era un interruptor de día completo, ver
// supabase/20_comodin_por_actividad.sql). Solo tiene sentido sobre
// restas: valida que el item exista, que no reste ya el comodín, y
// que el usuario todavía tenga comodines disponibles antes de
// consumir uno. Sus puntos originales quedan intactos en `puntos`
// (el historial los sigue mostrando, ver DayDetail.jsx) — solo se
// excluyen del cómputo del neto (pointsEngine.js).
export async function aplicarComodinAItem({ userId, entryId, reglaKey }) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('comodines_restantes')
    .eq('id', userId)
    .single();
  if (userError) throw userError;
  if (user.comodines_restantes <= 0) throw new Error('No quedan comodines disponibles.');

  const { data: item, error: itemError } = await supabase
    .from('entry_items')
    .select('puntos, comodin_aplicado')
    .eq('entry_id', entryId)
    .eq('regla_key', reglaKey)
    .single();
  if (itemError) throw itemError;
  if (item.comodin_aplicado) return { puntosNetos: await recalcularNeto(entryId), comodinesRestantes: user.comodines_restantes };
  if (item.puntos >= 0) throw new Error('El comodín solo se puede usar en actividades que restan puntos.');

  const { error: updError } = await supabase
    .from('entry_items')
    .update({ comodin_aplicado: true })
    .eq('entry_id', entryId)
    .eq('regla_key', reglaKey);
  if (updError) throw updError;

  const userActualizado = await ajustarComodines(userId, -1);
  const puntosNetos = await recalcularNeto(entryId);
  return { puntosNetos, comodinesRestantes: userActualizado.comodines_restantes };
}

// Inversa de aplicarComodinAItem: quita el comodín de una actividad y
// se lo reembolsa al usuario.
export async function quitarComodinDeItem({ userId, entryId, reglaKey }) {
  const { error: updError } = await supabase
    .from('entry_items')
    .update({ comodin_aplicado: false })
    .eq('entry_id', entryId)
    .eq('regla_key', reglaKey);
  if (updError) throw updError;

  const userActualizado = await ajustarComodines(userId, 1);
  const puntosNetos = await recalcularNeto(entryId);
  return { puntosNetos, comodinesRestantes: userActualizado.comodines_restantes };
}

// Activa/desactiva la comida libre del día (crea el entry si no existía).
export async function actualizarComidaLibre(userId, fecha, valor) {
  const entry = await ensureEntry(userId, fecha);
  const { error } = await supabase.from('daily_entries').update({ comida_libre_usada: valor }).eq('id', entry.id);
  if (error) throw error;
  const puntosNetos = await recalcularNeto(entry.id);
  return { entryId: entry.id, puntosNetos };
}

// Ajusta comodines_restantes del usuario (+1 al desactivar, -1 al activar)
export async function ajustarComodines(userId, delta) {
  if (!delta) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('comodines_restantes')
    .eq('id', userId)
    .single();
  if (error) throw error;

  const nuevo = Math.max(0, user.comodines_restantes + delta);
  const { data, error: updError } = await supabase
    .from('users')
    .update({ comodines_restantes: nuevo })
    .eq('id', userId)
    .select()
    .single();
  if (updError) throw updError;
  return data;
}
