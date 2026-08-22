import { supabase } from '../../lib/supabase';

// ============================================================
// Catálogo de reglas marcables manualmente (checklist).
// Excluye las "especial" (automatica = true) — esas las aplica
// un job en Fase 4, no el usuario. Excluye también las desactivadas
// desde el módulo administrativo (activo = false) — siguen existiendo
// para no perder el historial, pero no se ofrecen para registrar.
// ============================================================

export async function listCheckableRules() {
  const { data, error } = await supabase
    .from('rules')
    .select('regla_key, categoria, descripcion, puntos, tipo, orden, limite_categoria_dia, grupo_exclusivo')
    .eq('automatica', false)
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (error) throw error;
  return data;
}
