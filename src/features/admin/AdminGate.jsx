import { useState } from 'react';

// ============================================================
// Puerta de PIN para el módulo administrativo ("Gestionar Reto").
// PIN fijo de 4 dígitos, validado solo en el cliente — mismo
// modelo de "honor system" que el resto de la app (sin Supabase
// Auth). No es seguridad real: alguien con acceso al código o a
// las devtools puede saltárselo. Sirve para que no cualquiera
// desactive o edite actividades por accidente, no para blindar
// datos sensibles (ver §9 de HANDOFF.md).
// ============================================================

const PIN_ADMIN = '9610';

export default function AdminGate({ onUnlock, onBack }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);

  function handleSubmit() {
    if (pin === PIN_ADMIN) {
      onUnlock();
    } else {
      setError('PIN incorrecto.');
      setPin('');
    }
  }

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={onBack}>
          ← Volver
        </button>
        <h1 style={{ fontSize: 20, margin: 0 }}>Gestionar Reto</h1>
      </div>

      <div className="card">
        <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          PIN de administrador
        </label>
        <input
          className="input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          autoFocus
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          style={{ marginBottom: 10, textAlign: 'center', fontSize: 22, letterSpacing: 8 }}
        />
        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -4 }}>{error}</p>}
        <button
          className="btn btn-primary btn-block"
          onClick={handleSubmit}
          disabled={pin.length !== 4}
          style={{ opacity: pin.length !== 4 ? 0.5 : 1 }}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
