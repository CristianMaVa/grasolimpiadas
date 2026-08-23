import { supabase } from '../../lib/supabase';

// ============================================================
// CRUD de usuarios (participantes)
// Auth = selección de perfil, sin contraseña.
// El "borrado" es soft-delete (activo = false) para preservar
// el historial de daily_entries.
// ============================================================

// Lista los participantes activos (para el selector de perfil y el ranking).
// Incluye pin_habilitado y tiene_pin (booleano derivado de "pin is not
// null", ver supabase/16_fix_tiene_pin.sql) para saber si hay que pedir
// PIN, pero NUNCA el pin en sí — eso solo lo trae listUsersConPin(),
// para no exponer todos los PIN con solo cargar la pantalla de selección.
export async function listActiveUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, nombre, avatar_url, comodines_restantes, activo, pin_habilitado, tiene_pin')
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

// Sube una foto de perfil a Storage y devuelve su URL pública.
// No actualiza el usuario — el caller debe pasar la URL a updateUser().
export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop();
  const path = `${userId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file);
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
  return pub.publicUrl;
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

// ============================================================
// PIN por perfil (ajuste post-deploy — ver §3.18 en HANDOFF.md).
// Honor system, igual que el resto de la app: no hay backend, la
// validación pasa por la anon key. Disuade errores/curiosidad entre
// compañeros, no es seguridad real (ver §9).
// ============================================================

// Trae el PIN en texto plano — SOLO para la pantalla admin ("Gestionar
// Reto", ya protegida por su propio PIN). listActiveUsers() NUNCA
// incluye esta columna, para no exponer todos los PIN de una.
export async function listUsersConPin() {
  const { data, error } = await supabase
    .from('users')
    .select('id, nombre, pin, pin_habilitado')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}

function generarPinAleatorio() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

// Genera (o regenera) el PIN de un participante y lo devuelve para
// que el admin lo copie y se lo envíe.
export async function generarPin(userId) {
  const nuevoPin = generarPinAleatorio();
  const { error } = await supabase.from('users').update({ pin: nuevoPin }).eq('id', userId);
  if (error) throw error;
  return nuevoPin;
}

// Activa/desactiva si a ESTE usuario se le pide PIN (independiente
// del interruptor global — ver pin_config).
export async function actualizarPinHabilitado(userId, habilitado) {
  const { error } = await supabase.from('users').update({ pin_habilitado: habilitado }).eq('id', userId);
  if (error) throw error;
}

// Interruptor global: si es false, nadie pide PIN sin importar
// pin_habilitado de cada usuario. Sin fila todavía = false (no pedir).
export async function getPinConfig() {
  const { data, error } = await supabase
    .from('pin_config')
    .select('habilitado')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return { habilitado: data?.habilitado ?? false };
}

export async function guardarPinConfig(habilitado) {
  const { error } = await supabase.from('pin_config').upsert({ id: 1, habilitado });
  if (error) throw error;
}

// Verifica un intento de PIN. La comparación pin=pin ocurre en el
// WHERE de la consulta (no se trae el pin correcto al cliente para
// compararlo en JS) — un intento fallido no revela el valor real.
export async function verificarPin(userId, pinIntentado) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .eq('pin', pinIntentado)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
