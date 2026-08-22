import { supabase } from '../../lib/supabase';

// ============================================================
// Catálogo de reglas marcables manualmente (checklist).
// Excluye las "especial" (automatica = true) — esas las aplica
// un job en Fase 4, no el usuario.
// ============================================================

export async function listCheckableRules() {
  const { data, error } = await supabase
    .from('rules')
    .select('regla_key, categoria, descripcion, puntos, tipo, orden, limite_categoria_dia')
    .eq('automatica', false)
    .order('orden', { ascending: true });

  if (error) throw error;
  return data;
}
