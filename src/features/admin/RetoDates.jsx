import { useState, useEffect, useCallback } from 'react';
import { getRetoConfig, guardarRetoConfig } from '../reto/retoApi';

// ============================================================
// Fechas de inicio/fin del reto vigente (módulo "Gestionar Reto",
// tras el PIN). Al guardarlas, limitan el selector de fecha de "Hoy"
// (no se puede registrar antes del inicio ni después del fin) y
// activan el letrero de días restantes en la selección de perfil.
// ============================================================

export default function RetoDates() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config = await getRetoConfig();
      if (config) {
        setFechaInicio(config.fechaInicio);
        setFechaFin(config.fechaFin);
      }
      setError(null);
    } catch (e) {
      setError('No se pudieron cargar las fechas del reto.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const puedeGuardar = !!fechaInicio && !!fechaFin && fechaInicio <= fechaFin;

  async function handleGuardar() {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    setGuardado(false);
    try {
      await guardarRetoConfig({ fechaInicio, fechaFin });
      setGuardado(true);
    } catch (e) {
      setError('No se pudieron guardar las fechas.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
        Fechas del reto
      </label>

      {loading ? (
        <p className="muted" style={{ margin: 0 }}>Cargando…</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Inicio</label>
              <input
                type="date"
                className="input"
                value={fechaInicio}
                max={fechaFin || undefined}
                onChange={(e) => { setFechaInicio(e.target.value); setGuardado(false); }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Fin</label>
              <input
                type="date"
                className="input"
                value={fechaFin}
                min={fechaInicio || undefined}
                onChange={(e) => { setFechaFin(e.target.value); setGuardado(false); }}
              />
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
          {guardado && !error && <p style={{ color: 'var(--success)', fontSize: 13, marginBottom: 8 }}>Guardado.</p>}

          <button
            className="btn btn-primary btn-block"
            onClick={handleGuardar}
            disabled={!puedeGuardar || guardando}
            style={{ opacity: !puedeGuardar || guardando ? 0.5 : 1 }}
          >
            {guardando ? 'Guardando…' : 'Guardar fechas'}
          </button>
        </>
      )}
    </div>
  );
}
