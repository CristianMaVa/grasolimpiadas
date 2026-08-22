import { supabase } from '../../lib/supabase';

// ============================================================
// Configuración del reto: fecha de inicio y fin, fila única en
// reto_config (id=1). Se edita desde "Gestionar Reto" (admin) y se
// lee desde DailyEntry.jsx (limita el selector de fecha) y
// ProfileSelect.jsx (letrero de días restantes). Feature propia
// (no "admin" ni "entries") porque la consumen pantallas de features
// distintas — mismo criterio que Ranking, que se importa tal cual
// donde haga falta en vez de duplicar lógica.
// ============================================================

export async function getRetoConfig() {
  const { data, error } = await supabase
    .from('reto_config')
    .select('fecha_inicio, fecha_fin')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { fechaInicio: data.fecha_inicio, fechaFin: data.fecha_fin };
}

export async function guardarRetoConfig({ fechaInicio, fechaFin }) {
  const { error } = await supabase
    .from('reto_config')
    .upsert({ id: 1, fecha_inicio: fechaInicio, fecha_fin: fechaFin });
  if (error) throw error;
}
