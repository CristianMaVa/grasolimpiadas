import { supabase } from '../../lib/supabase';

// ============================================================
// CRUD de usuarios (participantes)
// Auth = selección de perfil, sin contraseña.
// El "borrado" es soft-delete (activo = false) para preservar
// el historial de daily_entries.
// ============================================================

// Lista los participantes activos (para el selector de perfil y el ranking)
export async function listActiveUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, nombre, avatar_url, comodines_restantes, activo')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}

// Lista todos (incluye inactivos) — útil para una vista de administración
export async function listAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, nombre, avatar_url, comodines_restantes, activo, created_at')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}

// Crea un participante nuevo
export async function createUser({ nombre, avatarUrl = null }) {
  const nombreLimpio = nombre?.trim();
  if (!nombreLimpio) throw new Error('El nombre no puede estar vacío.');

  const { data, error } = await supabase
    .from('users')
    .insert({ nombre: nombreLimpio, avatar_url: avatarUrl })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Renombra o actualiza el avatar de un participante
export async function updateUser(id, { nombre, avatarUrl }) {
  const patch = {};
  if (nombre !== undefined) {
    const n = nombre.trim();
    if (!n) throw new Error('El nombre no puede estar vacío.');
    patch.nombre = n;
  }
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl;

  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Soft-delete: saca al participante del reto sin borrar su historial
export async function deactivateUser(id) {
  const { data, error } = await supabase
    .from('users')
    .update({ activo: false })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Reactiva un participante previamente desactivado
export async function reactivateUser(id) {
  const { data, error } = await supabase
    .from('users')
    .update({ activo: true })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
