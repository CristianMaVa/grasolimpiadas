import { supabase } from '../../lib/supabase';

// ============================================================
// CRUD administrativo del catálogo de reglas (módulo "Gestionar
// Reto", protegido por PIN — ver AdminGate.jsx). A diferencia de
// rulesApi.js (solo lectura, para el checklist de registro diario),
// aquí se puede activar/desactivar, crear y ajustar puntos/tipo.
// De momento NO se gestionan limite_categoria_dia ni grupo_exclusivo
// desde acá (decisión explícita: eso se trabaja después).
// ============================================================

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Todas las reglas (activas e inactivas) — a diferencia de
// listCheckableRules(), que solo trae las que se pueden registrar hoy.
export async function listAllRules() {
  const { data, error } = await supabase
    .from('rules')
    .select('regla_key, categoria, descripcion, puntos, tipo, activo, orden')
    .order('orden', { ascending: true });
  if (error) throw error;
  return data;
}

// Crea una actividad nueva. El regla_key se genera del texto de la
// descripción (con sufijo si hay choque); nace activa, no automática,
// sin límite de categoría ni grupo exclusivo (se configuran después,
// directo en la DB, si hace falta).
export async function crearRegla({ categoria, descripcion, puntos, tipo }) {
  const { data: maxRows, error: maxError } = await supabase
    .from('rules')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1);
  if (maxError) throw maxError;
  const siguienteOrden = (maxRows[0]?.orden ?? 0) + 1;

  const puntosFirmados = tipo === 'resta' ? -Math.abs(puntos) : Math.abs(puntos);
  const base = `custom_${slugify(descripcion)}`;
  let reglaKey = base;
  let intento = 1;

  while (true) {
    const { error } = await supabase.from('rules').insert({
      regla_key: reglaKey,
      categoria,
      descripcion,
      puntos: puntosFirmados,
      tipo,
      automatica: false,
      orden: siguienteOrden,
      activo: true,
    });
    if (!error) return;
    if (error.code === '23505') { // unique_violation en regla_key
      intento += 1;
      reglaKey = `${base}_${intento}`;
      continue;
    }
    throw error;
  }
}

// Actualización parcial genérica — usada para activar/desactivar y
// para ajustar puntos/tipo. No toca entry_items ya registrados: esos
// guardan su propia copia de puntos/categoria al momento de marcarse,
// así que editar una regla acá solo afecta registros futuros.
export async function actualizarRegla(reglaKey, cambios) {
  const { error } = await supabase.from('rules').update(cambios).eq('regla_key', reglaKey);
  if (error) throw error;
}
