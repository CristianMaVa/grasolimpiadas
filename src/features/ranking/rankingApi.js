import { supabase } from '../../lib/supabase';

// ============================================================
// Ranking público. Lee de la vista v_ranking (suma de
// puntos_netos por usuario activo, total del reto — no semanal,
// decisión del dueño). La agregación vive en la DB, no aquí.
// Desempate: puntos_totales_sin_limite (mismo total pero sin el
// cap de +15/día) — los empates en puntos_totales son esperables
// justamente por ese cap.
// ============================================================

export async function getRanking() {
  const { data, error } = await supabase
    .from('v_ranking')
    .select('user_id, nombre, avatar_url, puntos_totales, puntos_totales_sin_limite, dias_registrados')
    .order('puntos_totales', { ascending: false })
    .order('puntos_totales_sin_limite', { ascending: false })
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}
