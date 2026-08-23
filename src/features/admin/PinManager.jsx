import { useState, useEffect, useCallback } from 'react';
import {
  listUsersConPin, generarPin, actualizarPinHabilitado,
  getPinConfig, guardarPinConfig,
} from '../users/usersApi';

// ============================================================
// PIN por perfil (módulo "Gestionar Reto", tras el PIN de admin).
// Interruptor global (pin_config) + interruptor y PIN por usuario.
// A un usuario se le pide PIN solo si AMBOS interruptores están en
// true. Generar PIN muestra el valor en texto plano acá mismo —
// es la lista que el admin copia y envía a cada jugador.
// ============================================================

export default function PinManager() {
  const [habilitadoGlobal, setHabilitadoGlobal] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guardandoGlobal, setGuardandoGlobal] = useState(false);
  const [generandoId, setGenerandoId] = useState(null);
  const [cambiandoId, setCambiandoId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [config, lista] = await Promise.all([getPinConfig(), listUsersConPin()]);
      setHabilitadoGlobal(config.habilitado);
      setUsuarios(lista);
      setError(null);
    } catch (e) {
      setError('No se pudo cargar la configuración de PIN.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggleGlobal() {
    const nuevoValor = !habilitadoGlobal;
    setGuardandoGlobal(true);
    setError(null);
    try {
      await guardarPinConfig(nuevoValor);
      setHabilitadoGlobal(nuevoValor);
    } catch (e) {
      setError('No se pudo actualizar el interruptor global.');
    } finally {
      setGuardandoGlobal(false);
    }
  }

  async function handleGenerarPin(userId) {
    setGenerandoId(userId);
    setError(null);
    try {
      const nuevoPin = await generarPin(userId);
      setUsuarios((prev) => prev.map((u) => (u.id === userId ? { ...u, pin: nuevoPin } : u)));
    } catch (e) {
      setError('No se pudo generar el PIN.');
    } finally {
      setGenerandoId(null);
    }
  }

  async function handleTogglePinUsuario(usuario) {
    setCambiandoId(usuario.id);
    setError(null);
    try {
      await actualizarPinHabilitado(usuario.id, !usuario.pin_habilitado);
      setUsuarios((prev) => prev.map((u) => (
        u.id === usuario.id ? { ...u, pin_habilitado: !u.pin_habilitado } : u
      )));
    } catch (e) {
      setError('No se pudo actualizar el participante.');
    } finally {
      setCambiandoId(null);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <label className="muted" style={{ fontSize: 13 }}>PIN por perfil</label>
        <button
          className="btn"
          onClick={handleToggleGlobal}
          disabled={guardandoGlobal}
          style={{
            padding: '6px 12px', fontSize: 13,
            background: habilitadoGlobal ? 'var(--success)' : 'var(--surface-2)',
            borderColor: habilitadoGlobal ? 'var(--success)' : 'var(--border)',
            opacity: guardandoGlobal ? 0.6 : 1,
          }}
        >
          {habilitadoGlobal ? 'Activado' : 'Desactivado'}
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 14 }}>
        Con esto activado, cada participante con PIN habilitado debe ingresarlo para entrar a su perfil.
      </p>

      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</p>}
      {loading && <p className="muted" style={{ margin: 0 }}>Cargando…</p>}

      {!loading && usuarios.map((u) => (
        <div
          key={u.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 0', borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ flex: 1, fontSize: 14 }}>{u.nombre}</span>
          <span
            className="muted"
            style={{
              fontSize: 15, fontWeight: 700, letterSpacing: 2, fontFamily: 'monospace',
              color: u.pin ? 'var(--text)' : 'var(--text-muted)',
              minWidth: 52, textAlign: 'center',
            }}
          >
            {u.pin ?? '----'}
          </span>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
            onClick={() => handleGenerarPin(u.id)}
            disabled={generandoId === u.id}
          >
            {generandoId === u.id ? '…' : u.pin ? 'Regenerar' : 'Generar'}
          </button>
          <button
            className="btn btn-ghost"
            style={{
              padding: '6px 10px', fontSize: 12,
              color: u.pin_habilitado ? 'var(--success)' : 'var(--text-muted)',
            }}
            onClick={() => handleTogglePinUsuario(u)}
            disabled={cambiandoId === u.id}
          >
            {u.pin_habilitado ? 'ON' : 'OFF'}
          </button>
        </div>
      ))}
    </div>
  );
}
