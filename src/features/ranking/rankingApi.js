import { supabase } from '../../lib/supabase';

// ============================================================
// Ranking público. Lee de la vista v_ranking (suma de
// puntos_netos por usuario activo, total del reto — no semanal,
// decisión del dueño). La agregación vive en la DB, no aquí.
// ============================================================

export async function getRanking() {
  const { data, error } = await supabase
    .from('v_ranking')
    .select('user_id, nombre, avatar_url, puntos_totales, dias_registrados')
    .order('puntos_totales', { ascending: false })
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}
