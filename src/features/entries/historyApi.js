import { supabase } from '../../lib/supabase';

// ============================================================
// Historial personal: días registrados de un usuario, más
// recientes primero.
// ============================================================

export async function getHistoryForUser(userId) {
  const { data, error } = await supabase
    .from('daily_entries')
    .select('id, fecha, puntos_netos, comida_libre_usada, comodin_usado')
    .eq('user_id', userId)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data;
}
