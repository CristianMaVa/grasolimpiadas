import { useState, useEffect, useCallback } from 'react';

// ============================================================
// Sesión de perfil (sin contraseña).
// Guarda el usuario seleccionado en localStorage para que
// no tenga que reelegir en cada carga. No es seguridad real
// (honor system) — solo comodidad.
// ============================================================

const STORAGE_KEY = 'grasol_profile';

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch (_) {
      // ignora datos corruptos
    }
    setReady(true);
  }, []);

  const selectProfile = useCallback((user) => {
    setProfile(user);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (_) {}
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }, []);

  // Actualiza campos del perfil cacheado (ej. comodines_restantes tras usarlos)
  const updateProfile = useCallback((patch) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  return { profile, ready, selectProfile, clearProfile, updateProfile };
}
