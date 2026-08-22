import { useState, useEffect, useCallback, useMemo } from 'react';
import { getRanking } from './rankingApi';
import Avatar from '../users/Avatar';

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

  // El color siempre refleja el signo del valor (verde positivo, rojo
  // negativo); el último lugar prima en rojo aunque su valor sea 0.
  function colorPuntos(valor, esUltimo) {
    if (esUltimo) return 'var(--danger)';
    if (valor > 0) return 'var(--success)';
    if (valor < 0) return 'var(--danger)';
    return 'var(--text)';
  }

  // Últimos lugares reales: primero el mínimo de puntos_totales, y
  // ENTRE esos, el mínimo de puntos_totales_sin_limite — el cap de
  // +15/día hace que los empates en puntos_totales sean comunes, pero
  // el desempate casi siempre distingue a quién le fue peor.
  const idsUltimoLugar = useMemo(() => {
    if (ranking.length <= 1) return new Set();
    const minPuntos = Math.min(...ranking.map((r) => r.puntos_totales));
    const entreMinimos = ranking.filter((r) => r.puntos_totales === minPuntos);
    const minSinLimite = Math.min(...entreMinimos.map((r) => r.puntos_totales_sin_limite));
    return new Set(
      entreMinimos
        .filter((r) => r.puntos_totales_sin_limite === minSinLimite)
        .map((r) => r.user_id)
    );
  }, [ranking]);

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
        const esUltimo = idsUltimoLugar.has(r.user_id);
        const esTop3 = !esUltimo && i < 3;
        return (
          <div
            key={r.user_id}
            className="card"
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 10,
              borderColor: esUltimo ? 'var(--danger)' : esTop3 ? 'var(--success)' : 'var(--border)',
              background: esUltimo ? 'var(--accent-soft)' : esTop3 ? 'var(--success-soft)' : 'var(--surface)',
            }}
          >
            <span className="muted" style={{ fontSize: 15, fontWeight: 700, width: 22, textAlign: 'center' }}>
              {i + 1}
            </span>
            <Avatar user={r} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{r.nombre}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {r.dias_registrados} día{r.dias_registrados === 1 ? '' : 's'} registrado{r.dias_registrados === 1 ? '' : 's'}
              </div>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: colorPuntos(r.puntos_totales, esUltimo) }}>
              {r.puntos_totales > 0 ? `+${r.puntos_totales}` : r.puntos_totales}
              {' '}
              <span style={{ fontSize: 13, fontWeight: 600, color: colorPuntos(r.puntos_totales_sin_limite, esUltimo) }}>
                ({r.puntos_totales_sin_limite > 0 ? `+${r.puntos_totales_sin_limite}` : r.puntos_totales_sin_limite})
              </span>
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
