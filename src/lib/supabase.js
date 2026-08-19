import { createClient } from '@supabase/supabase-js';

// Variables de entorno (definir en .env.local):
//   VITE_SUPABASE_URL=...
//   VITE_SUPABASE_ANON_KEY=...
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Mensaje claro en desarrollo si faltan las llaves
  console.error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
