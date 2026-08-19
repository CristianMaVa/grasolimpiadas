import { useState, useEffect, useCallback } from 'react';
import { getRanking } from './rankingApi';
import { initials, avatarColor } from '../users/avatar';

// ============================================================
// Ranking público (Fase 3).
// Total acumulado del reto por usuario activo. El último lugar
// se resalta — es parte del concepto de las Grasolimpiadas.
// ============================================================

export default function Ranking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRanking();
      setRanking(data);
    } catch (e) {
      setError('No se pudo cargar el ranking.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const minPuntos = ranking.length > 1
    ? Math.min(...ranking.map((r) => r.puntos_totales))
    : null;

  return (
    <div>
      {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && ranking.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ marginTop: 0 }} className="muted">Todavía no hay puntos registrados.</p>
        </div>
      )}

      {!loading && ranking.map((r, i) => {
        const esUltimo = minPuntos !== null && r.puntos_totales === minPuntos;
        return (
          <div
            key={r.user_id}
            className="card"
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 10,
              borderColor: esUltimo ? 'var(--danger)' : 'var(--border)',
              background: esUltimo ? 'var(--accent-soft)' : 'var(--surface)',
            }}
          >
            <span className="muted" style={{ fontSize: 15, fontWeight: 700, width: 22, textAlign: 'center' }}>
              {i + 1}
            </span>
            <span style={{
              width: 36, height: 36, borderRadius: '50%',
              background: avatarColor(r.nombre), color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: 13, flexShrink: 0,
            }}>
              {initials(r.nombre)}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{r.nombre}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {r.dias_registrados} día{r.dias_registrados === 1 ? '' : 's'} registrado{r.dias_registrados === 1 ? '' : 's'}
              </div>
            </div>
            <span style={{
              fontSize: 18, fontWeight: 700,
              color: esUltimo ? 'var(--danger)' : 'var(--accent)',
            }}>
              {r.puntos_totales > 0 ? `+${r.puntos_totales}` : r.puntos_totales}
            </span>
            {esUltimo && (
              <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                Último
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
