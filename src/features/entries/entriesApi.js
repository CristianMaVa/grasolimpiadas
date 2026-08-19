import { supabase } from '../../lib/supabase';
import { calcularNeto } from './pointsEngine';

// ============================================================
// CRUD de registro diario.
// Un daily_entry por (user_id, fecha); sus entry_items se
// reemplazan por completo en cada guardado (más simple que un
// diff, y el volumen por día es chico).
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

// Carga el entry (si existe) y las regla_key marcadas para user+fecha
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

// Guarda (crea o actualiza) el día completo: entry + items + foto opcional.
// `reglas` es el catálogo completo (para copiar categoria/puntos a los items).
export async function saveDailyEntry({
  userId, fecha, reglas, reglaKeysMarcadas, comodinUsado, comidaLibreUsada, foto,
}) {
  const { data: entry, error: upsertError } = await supabase
    .from('daily_entries')
    .upsert(
      { user_id: userId, fecha, comida_libre_usada: comidaLibreUsada, comodin_usado: comodinUsado },
      { onConflict: 'user_id,fecha' }
    )
    .select()
    .single();
  if (upsertError) throw upsertError;

  const { error: delError } = await supabase.from('entry_items').delete().eq('entry_id', entry.id);
  if (delError) throw delError;

  const items = reglas
    .filter((r) => reglaKeysMarcadas.includes(r.regla_key))
    .map((r) => ({ entry_id: entry.id, regla_key: r.regla_key, categoria: r.categoria, puntos: r.puntos }));

  if (items.length > 0) {
    const { error: insError } = await supabase.from('entry_items').insert(items);
    if (insError) throw insError;
  }

  const puntosNetos = calcularNeto(items, { comodinUsado, comidaLibreUsada });

  const { data: entryFinal, error: updError } = await supabase
    .from('daily_entries')
    .update({ puntos_netos: puntosNetos })
    .eq('id', entry.id)
    .select()
    .single();
  if (updError) throw updError;

  if (foto) {
    const ext = foto.name.split('.').pop();
    const path = `${userId}/${fecha}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('evidence').upload(path, foto);
    if (uploadError) throw uploadError;

    const { data: pub } = supabase.storage.from('evidence').getPublicUrl(path);
    const { error: evError } = await supabase
      .from('evidence')
      .insert({ entry_id: entry.id, foto_url: pub.publicUrl });
    if (evError) throw evError;
  }

  return entryFinal;
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
