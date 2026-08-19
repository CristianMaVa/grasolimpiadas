import { useState, useEffect, useCallback } from 'react';
import { getHistoryForUser } from './historyApi';

// ============================================================
// Historial personal (Fase 3).
// Días registrados del usuario actual, con el neto de cada uno
// y el acumulado total.
// ============================================================

function formatFecha(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00`);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function History({ profile }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div>
      {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && (
        <>
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
            <div
              key={e.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '12px 16px' }}
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
            </div>
          ))}
        </>
      )}
    </div>
  );
}
