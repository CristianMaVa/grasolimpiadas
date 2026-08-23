import { useState, useEffect, useCallback } from 'react';
import { getHistoryForUser } from './historyApi';
import DayDetail from './DayDetail';

// ============================================================
// Historial personal (Fase 3).
// Días registrados del usuario actual, con el neto de cada uno
// y el acumulado total. Cada día abre un detalle de solo lectura
// con lo marcado ese día (ver DayDetail.jsx).
// ============================================================

// Fecha local en formato YYYY-MM-DD (no toISOString(), que es UTC y se
// adelanta un día cerca de la medianoche en zonas horarias negativas).
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatFecha(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00`);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function History({ profile, onEditarDia }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null); // { id, fecha, comodinUsado, comidaLibreUsada }
  const [fechaOlvidada, setFechaOlvidada] = useState(hoyISO());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistoryForUser(profile.id);
      setEntries(data);
    } catch (e) {
      setError('No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => { load(); }, [load]);

  const totalAcumulado = entries.reduce((s, e) => s + e.puntos_netos, 0);

  if (seleccionado) {
    return (
      <DayDetail
        entryId={seleccionado.id}
        fecha={seleccionado.fecha}
        comodinUsado={seleccionado.comodinUsado}
        comidaLibreUsada={seleccionado.comidaLibreUsada}
        onBack={() => setSeleccionado(null)}
        onEditar={onEditarDia}
      />
    );
  }

  return (
    <div>
      {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              ¿Se te olvidó un día, o quieres marcar una penalidad retroactiva? (día perdido, fin de semana destructivo, no registré el día…)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                className="input"
                value={fechaOlvidada}
                max={hoyISO()}
                onChange={(e) => setFechaOlvidada(e.target.value)}
              />
              <button className="btn btn-primary" onClick={() => onEditarDia(fechaOlvidada)}>
                Ir
              </button>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 14 }}>Total acumulado</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: totalAcumulado < 0 ? 'var(--danger)' : 'var(--accent)' }}>
              {totalAcumulado > 0 ? `+${totalAcumulado}` : totalAcumulado}
            </span>
          </div>

          {entries.length === 0 && (
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ marginTop: 0 }} className="muted">Todavía no registras ningún día.</p>
            </div>
          )}

          {entries.map((e) => (
            <button
              key={e.id}
              className="card"
              onClick={() => setSeleccionado({
                id: e.id, fecha: e.fecha,
                comodinUsado: e.comodin_usado, comidaLibreUsada: e.comida_libre_usada,
              })}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '12px 16px',
                width: '100%', textAlign: 'left',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, textTransform: 'capitalize' }}>{formatFecha(e.fecha)}</div>
                {(e.comodin_usado || e.comida_libre_usada) && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {e.comodin_usado ? 'Comodín' : ''}
                    {e.comodin_usado && e.comida_libre_usada ? ' · ' : ''}
                    {e.comida_libre_usada ? 'Comida libre' : ''}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 16, fontWeight: 700,
                color: e.puntos_netos < 0 ? 'var(--danger)' : 'var(--accent)',
              }}>
                {e.puntos_netos > 0 ? `+${e.puntos_netos}` : e.puntos_netos}
              </span>
              <span className="muted" style={{ fontSize: 16 }}>›</span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
