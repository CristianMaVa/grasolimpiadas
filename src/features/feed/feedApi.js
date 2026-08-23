import { supabase } from '../../lib/supabase';

// ============================================================
// Feed de comportamiento sospechoso. Lee de la vista
// v_comportamiento_sospechoso (ver supabase/17_comportamiento_
// sospechoso.sql), que combina dos tipos de "publicación":
// - 'eliminacion': alguien borró un item ya registrado (bitácora
//   real, tabla eliminaciones_registradas).
// - 'registro_tardio': un entry_item se guardó en una fecha distinta
//   a la que registra (calculado al vuelo, sin tabla propia).
// Visible para todos los participantes, no solo el admin — es una
// pestaña más de la app, no un panel de "Gestionar Reto".
// ============================================================

export async function getFeed(limite = 50) {
  const { data, error } = await supabase
    .from('v_comportamiento_sospechoso')
    .select('tipo, id, user_id, nombre, avatar_url, descripcion_regla, puntos, fecha_actividad, ocurrido_en')
    .order('ocurrido_en', { ascending: false })
    .limit(limite);

  if (error) throw error;
  return data;
}
