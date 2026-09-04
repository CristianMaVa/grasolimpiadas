import { useState, useEffect } from 'react';
import { getDayDetail } from './entriesApi';
import ItemRow from './ItemRow';

// ============================================================
// Detalle de solo lectura de un día del historial: qué se marcó
// ese día (la evidencia se reporta por WhatsApp, no en la app).
// ============================================================

function formatFecha(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00`);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' });
}

export default function DayDetail({ entryId, fecha, comodinUsado, comidaLibreUsada, onBack, onEditar }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDayDetail(entryId);
        if (alive) setItems(data);
      } catch (e) {
        if (alive) setError('No se pudo cargar el detalle del día.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [entryId]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={onBack}>
          ← Volver
        </button>
        <h1 style={{ fontSize: 17, margin: 0, textTransform: 'capitalize' }}>{formatFecha(fecha)}</h1>
      </div>

      {onEditar && (
        <button
          className="btn btn-ghost btn-block"
          style={{ marginBottom: 16 }}
          onClick={() => onEditar(fecha)}
        >
          Editar este día
        </button>
      )}

      {(comodinUsado || comidaLibreUsada) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {comodinUsado && <Etiqueta>Comodín</Etiqueta>}
          {comidaLibreUsada && <Etiqueta>Comida libre</Etiqueta>}
        </div>
      )}

      {loading && <p className="muted">Cargando…</p>}
      {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="muted" style={{ margin: 0 }}>
            {comodinUsado || comidaLibreUsada
              ? 'No se marcó ninguna actividad ese día.'
              : 'No se marcó nada ese día.'}
          </p>
        </div>
      )}

      {!loading && items.map((item) => (
        <ItemRow
          key={item.regla_key}
          descripcion={item.descripcion}
          puntos={item.comodinAplicado ? 0 : item.puntos}
          subtitulo={item.comodinAplicado ? `Comodín aplicado · antes ${item.puntos}` : undefined}
        />
      ))}
    </div>
  );
}

function Etiqueta({ children }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999,
      background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
    }}>
      {children}
    </span>
  );
}
