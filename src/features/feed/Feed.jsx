import { useState, useEffect, useCallback } from 'react';
import { getFeed } from './feedApi';
import Avatar from '../users/Avatar';

// ============================================================
// Feed de comportamiento sospechoso (Fase 2 de "controles internos",
// ajuste post-deploy). Visible para todos, sin elegir perfil — se
// llega acá desde el "Ver más" de FeedPreview en ProfileSelect.jsx
// (que muestra solo las 5 publicaciones más recientes; esta pantalla
// trae hasta 50). No es un panel de admin. Muestra "publicaciones"
// de tres tipos: eliminaciones de items ya registrados, registros
// guardados en una fecha distinta a la que reportan (cualquier
// diferencia de día cuenta, sin importar cuántos días), y check-ins
// pasadas las 11pm en noche de domingo a jueves sin marcar la
// penalidad "Trasnochar sin motivo" (§3.23).
// ============================================================

function formatFechaCorta(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00`);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

// Igual que formatFechaCorta, pero para un timestamp con hora
// (ocurrido_en, en UTC) — hay que convertirlo a hora de Colombia
// antes de sacar el día, igual que hace la vista SQL. Si se usa
// .slice(0,10) sobre el ISO crudo (fecha UTC) en vez de esto, un
// registro guardado tarde en la noche colombiana puede mostrarse con
// la fecha del día siguiente en UTC — la misma clase de bug que ya
// se corrigió en el resto de la app (ver HANDOFF, ajuste de zona
// horaria) y que aquí volvería confuso justo lo que este feed
// intenta señalar.
function formatFechaCortaEnColombia(fechaISOConHora) {
  const d = new Date(fechaISOConHora);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'America/Bogota' });
}

function formatDiaSemana(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00`);
  return d.toLocaleDateString('es-ES', { weekday: 'long' });
}

// Hora (hh:mm, 24h) en Colombia — para mostrar a qué hora exacta se
// registró un check-in tardío en la noche (§3.23, trasnocho no
// declarado).
function formatHoraColombia(fechaISOConHora) {
  const d = new Date(fechaISOConHora);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
}

// "hace X" relativo al momento de la publicación — estética de feed.
function formatRelativo(fechaISOConHora) {
  const entonces = new Date(fechaISOConHora);
  const segundos = Math.floor((Date.now() - entonces.getTime()) / 1000);

  if (segundos < 60) return 'hace un momento';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `hace ${dias} día${dias === 1 ? '' : 's'}`;
  return entonces.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export default function Feed({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFeed();
      setItems(data);
      setError(null);
    } catch (e) {
      setError('No se pudo cargar el feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={onBack}>
          ← Volver
        </button>
        <h1 style={{ fontSize: 20, margin: 0 }}>Comportamiento sospechoso</h1>
      </div>

      <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Eliminaciones y registros guardados en una fecha distinta a la que reportan — visible para todos, como control interno del grupo.
      </p>

      {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && !error && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="muted" style={{ margin: 0 }}>Nada raro por aquí todavía.</p>
        </div>
      )}

      {!loading && items.map((item) => (
        <div key={`${item.tipo}-${item.id}`} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar user={{ nombre: item.nombre, avatar_url: item.avatar_url }} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{item.nombre}</span>
              <span
                style={{
                  marginLeft: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: item.tipo === 'registro_tardio' ? 'var(--accent)' : 'var(--danger)',
                }}
              >
                {item.tipo === 'eliminacion' ? 'Eliminó' : item.tipo === 'trasnocho_no_declarado' ? 'Trasnochó sin marcar' : 'Registro tardío'}
              </span>
            </div>
            <span className="muted" style={{ fontSize: 12, flexShrink: 0 }}>
              {formatRelativo(item.ocurrido_en)}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14 }}>
            {item.tipo === 'eliminacion' ? (
              <>
                Eliminó <strong>{item.descripcion_regla}</strong> ({item.puntos > 0 ? `+${item.puntos}` : item.puntos}) del {formatFechaCorta(item.fecha_actividad)}.
              </>
            ) : item.tipo === 'trasnocho_no_declarado' ? (
              <>
                Registró su día del <strong>{formatDiaSemana(item.fecha_actividad)} {formatFechaCorta(item.fecha_actividad)}</strong> a las {formatHoraColombia(item.ocurrido_en)}, sin marcar <strong>Trasnochar sin motivo</strong>.
              </>
            ) : (
              <>
                Registró <strong>{item.descripcion_regla}</strong> ({item.puntos > 0 ? `+${item.puntos}` : item.puntos}) del {formatFechaCorta(item.fecha_actividad)}, guardado el {formatFechaCortaEnColombia(item.ocurrido_en)}.
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
