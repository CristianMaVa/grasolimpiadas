import { supabase } from '../../lib/supabase';
import { calcularNeto, calcularNetoSinLimite } from './pointsEngine';

// ============================================================
// CRUD de registro diario.
// Modelo incremental: cada actividad se registra y persiste al
// toque (no hay un botón único de "guardar todo el día"). Una
// regla se registra como máximo una vez por día — ver
// registrarActividad(). Los flags del día (comodín, comida
// libre) también se guardan al toque.
// ============================================================

function lunesDe(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00`);
  const dia = d.getDay(); // 0 = domingo
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d;
}

function aISO(d) {
  return d.toISOString().slice(0, 10);
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
// tras cada acción.
async function recalcularNeto(entryId) {
  const { data: entry, error: entryError } = await supabase
    .from('daily_entries')
    .select('comodin_usado, comida_libre_usada')
    .eq('id', entryId)
    .single();
  if (entryError) throw entryError;

  const { data: items, error: itemsError } = await supabase
    .from('entry_items')
    .select('categoria, puntos')
    .eq('entry_id', entryId);
  if (itemsError) throw itemsError;

  const opts = { comodinUsado: entry.comodin_usado, comidaLibreUsada: entry.comida_libre_usada };
  const puntosNetos = calcularNeto(items, opts);
  const puntosNetosSinLimite = calcularNetoSinLimite(items, opts);

  const { error: updError } = await supabase
    .from('daily_entries')
    .update({ puntos_netos: puntosNetos, puntos_netos_sin_limite: puntosNetosSinLimite })
    .eq('id', entryId);
  if (updError) throw updError;

  return puntosNetos;
}

// Carga el entry (si existe) y las regla_key ya registradas — para
// saber qué actividades ya están hechas hoy y no ofrecerlas de nuevo.
export async function getEntryForDate(userId, fecha) {
  const { data: entry, error } = await supabase
    .from('daily_entries')
    .select('id, fecha, puntos_netos, comida_libre_usada, comodin_usado')
    .eq('user_id', userId)
    .eq('fecha', fecha)
    .maybeSingle();

  if (error) throw error;
  if (!entry) return { entry: null, reglaKeys: [] };

  const { data: items, error: itemsError } = await supabase
    .from('entry_items')
    .select('regla_key')
    .eq('entry_id', entry.id);
  if (itemsError) throw itemsError;

  return { entry, reglaKeys: items.map((i) => i.regla_key) };
}

// Detalle de solo lectura de un día ya guardado: qué se marcó. Para
// el drill-down del historial.
export async function getDayDetail(entryId) {
  const { data: items, error: itemsError } = await supabase
    .from('entry_items')
    .select('regla_key, categoria, puntos, rules(descripcion)')
    .eq('entry_id', entryId);
  if (itemsError) throw itemsError;

  return items.map((i) => ({
    regla_key: i.regla_key,
    categoria: i.categoria,
    puntos: i.puntos,
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

// Activa/desactiva el comodín del día (crea el entry si no existía).
export async function actualizarComodin(userId, fecha, valor) {
  const entry = await ensureEntry(userId, fecha);
  const { error } = await supabase.from('daily_entries').update({ comodin_usado: valor }).eq('id', entry.id);
  if (error) throw error;
  const puntosNetos = await recalcularNeto(entry.id);
  return { entryId: entry.id, puntosNetos };
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
