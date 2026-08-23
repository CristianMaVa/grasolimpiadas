import { useState, useEffect } from 'react';
import { listActiveUsers, getPinConfig, verificarPin } from './usersApi';
import { getRetoConfig } from '../reto/retoApi';
import { getFeed } from '../feed/feedApi';
import Avatar from './Avatar';
import Ranking from '../ranking/Ranking';

// ============================================================
// Pantalla de selección de perfil.
// Muestra los participantes activos como botones. Al tocar uno,
// se entra como ese usuario (honor system, sin contraseña).
// Debajo del header, el letrero de días restantes del reto (si ya
// se configuraron las fechas desde "Gestionar Reto" — si no, no se
// muestra nada) y, justo debajo, la vista previa del feed de
// comportamiento sospechoso (últimas 5 publicaciones, con "Ver más"
// hacia el feed completo — ver Feed.jsx). Más abajo, el ranking
// público — visible sin necesidad de elegir perfil, para que el
// último no pase desapercibido ni un segundo. Cada fila del ranking
// es clickeable: lleva al historial de solo lectura de esa persona,
// sin PIN (ver `onVerHistorialDe`, manejado en App.jsx con
// `readOnly` en History.jsx) — el Ranking ya no es una pestaña
// dentro del perfil, vive únicamente acá.
// ============================================================

// Fecha local en formato YYYY-MM-DD (no toISOString(), que es UTC y se
// adelanta un día cerca de la medianoche en zonas horarias negativas —
// afectaba el conteo de "días restantes").
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function diasEntre(desdeISO, hastaISO) {
  const desde = new Date(`${desdeISO}T00:00:00`);
  const hasta = new Date(`${hastaISO}T00:00:00`);
  return Math.round((hasta - desde) / 86400000);
}

function formatFechaCorta(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00`);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

// "hace X" relativo — mismo criterio que Feed.jsx (duplicado a
// propósito, ver convención del proyecto de no crear un util
// compartido para helpers cortos como este).
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

function FeedPreviewRow({ item }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
      <Avatar user={{ nombre: item.nombre, avatar_url: item.avatar_url }} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{item.nombre}</span>
        <span
          style={{
            marginLeft: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            color: item.tipo === 'registro_tardio' ? 'var(--accent)' : 'var(--danger)',
          }}
        >
          {item.tipo === 'eliminacion' ? 'Eliminó' : item.tipo === 'trasnocho_no_declarado' ? 'Trasnochó' : 'Tardío'}
        </span>
        <div
          className="muted"
          style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {item.descripcion_regla}
        </div>
      </div>
      <span className="muted" style={{ fontSize: 11, flexShrink: 0 }}>{formatRelativo(item.ocurrido_en)}</span>
    </div>
  );
}

// Puntos indicadores del slider (uno por publicación), estética de
// carrusel — el activo se pinta con el color de acento.
function FeedDots({ count, activeIndex }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: i === activeIndex ? 'var(--accent)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  );
}

// Vista previa del feed de comportamiento sospechoso: slider
// automático que muestra UNA publicación a la vez (de las 5 más
// recientes) y avanza sola cada 5s, con puntos de posición debajo —
// pedido explícito del dueño para que se sienta como un carrusel de
// notificación bancaria en vez de una lista estática. "Ver más" lleva
// al feed completo (Feed.jsx). Si falla la carga, no muestra nada —
// no es crítico para poder elegir perfil.
function FeedPreview({ onVerMas }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getFeed(5);
        if (alive) {
          setItems(data);
          setIndex(0);
        }
      } catch (e) {
        // Silencioso.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5000);
    return () => clearInterval(id);
  }, [items.length]);

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Comportamiento sospechoso</span>
        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={onVerMas}>
          Ver más
        </button>
      </div>

      {loading && <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>Cargando…</p>}
      {!loading && items.length === 0 && (
        <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>Nada raro por aquí.</p>
      )}
      {!loading && items.length > 0 && (
        <>
          {/* Pista con todas las publicaciones en fila; se desliza vía
              transform en vez de reemplazar el contenido, para que el
              cambio de slide se vea como un swipe y no como un salto. */}
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                transform: `translateX(-${index * 100}%)`,
                transition: 'transform 0.5s ease',
              }}
            >
              {items.map((item) => (
                <div key={`${item.tipo}-${item.id}`} style={{ flex: '0 0 100%', minWidth: 0 }}>
                  <FeedPreviewRow item={item} />
                </div>
              ))}
            </div>
          </div>
          {items.length > 1 && <FeedDots count={items.length} activeIndex={index} />}
        </>
      )}
    </div>
  );
}

function RetoBanner({ fechaInicio, fechaFin }) {
  const hoy = hoyISO();
  const terminado = hoy > fechaFin;
  const diasRestantes = Math.max(0, diasEntre(hoy, fechaFin));

  return (
    <div className="card" style={{ textAlign: 'center', marginBottom: 24, borderColor: 'var(--accent)' }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>
        {terminado
          ? 'Reto finalizado'
          : `${diasRestantes} día${diasRestantes === 1 ? '' : 's'} restante${diasRestantes === 1 ? '' : 's'}`}
      </div>
      <div className="muted" style={{ fontSize: 13, marginTop: 4, textTransform: 'capitalize' }}>
        {formatFechaCorta(fechaInicio)} – {formatFechaCorta(fechaFin)}
      </div>
    </div>
  );
}

export default function ProfileSelect({ onSelect, onManage, onAdmin, onVerFeed, onVerHistorialDe }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reto, setReto] = useState(null);
  const [pinGlobalHabilitado, setPinGlobalHabilitado] = useState(false);

  const [pinPendiente, setPinPendiente] = useState(null); // usuario esperando PIN, o null
  const [pinIngresado, setPinIngresado] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [pinError, setPinError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listActiveUsers();
        if (alive) setUsers(data);
      } catch (e) {
        if (alive) setError('No se pudieron cargar los participantes.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const config = await getRetoConfig();
        if (alive) setReto(config);
      } catch (e) {
        // Silencioso: sin config todavía, simplemente no se muestra el letrero.
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const config = await getPinConfig();
        if (alive) setPinGlobalHabilitado(config.habilitado);
      } catch (e) {
        // Silencioso: si falla, nadie pide PIN (mismo comportamiento que antes).
      }
    })();
    return () => { alive = false; };
  }, []);

  // Un usuario pide PIN solo si el interruptor global Y el suyo están
  // activos Y ya tiene un PIN asignado (sin PIN asignado = no se pide,
  // para no trabar a nadie por un olvido del admin). `tiene_pin` es un
  // booleano derivado en la DB (pin is not null) — listActiveUsers()
  // nunca trae el valor real del pin, así que no se puede usar `u.pin`.
  function requierePin(u) {
    return pinGlobalHabilitado && u.pin_habilitado && !!u.tiene_pin;
  }

  function handleElegirPerfil(u) {
    if (requierePin(u)) {
      setPinPendiente(u);
      setPinIngresado('');
      setPinError(null);
    } else {
      onSelect(u);
    }
  }

  function cancelarPin() {
    setPinPendiente(null);
    setPinIngresado('');
    setPinError(null);
  }

  async function confirmarPin() {
    if (pinIngresado.length !== 4) return;
    setVerificando(true);
    setPinError(null);
    try {
      const ok = await verificarPin(pinPendiente.id, pinIngresado);
      if (ok) {
        onSelect(pinPendiente);
        setPinPendiente(null);
        setPinIngresado('');
      } else {
        setPinError('PIN incorrecto.');
        setPinIngresado('');
      }
    } catch (e) {
      setPinError('No se pudo verificar el PIN.');
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div style={{ paddingTop: 40 }}>
      <header style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          fontSize: 11, letterSpacing: 2, color: 'var(--accent)',
          fontWeight: 600, textTransform: 'uppercase',
        }}>
          Se acabaron las excusas
        </div>
        <h1 style={{ fontSize: 26, margin: '6px 0 2px' }}>Las Grasolimpiadas</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          ¿Quién eres, competidor?
        </p>
      </header>

      {reto && <RetoBanner fechaInicio={reto.fechaInicio} fechaFin={reto.fechaFin} />}

      <FeedPreview onVerMas={onVerFeed} />

      {loading && <p className="muted" style={{ textAlign: 'center' }}>Cargando…</p>}
      {error && <p style={{ color: 'var(--danger)', textAlign: 'center' }}>{error}</p>}

      {!loading && !error && users.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ marginTop: 0 }}>Todavía no hay competidores.</p>
          <button className="btn btn-primary btn-block" onClick={onManage}>
            Agregar el primero
          </button>
        </div>
      )}

      {!loading && users.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}>
            {users.map((u) => (
              <button
                key={u.id}
                className="btn"
                style={{ justifyContent: 'flex-start', padding: 12 }}
                onClick={() => handleElegirPerfil(u)}
              >
                <Avatar user={u} size={34} />
                <span style={{ fontSize: 15 }}>{u.nombre}</span>
              </button>
            ))}
          </div>

          <button
            className="btn btn-ghost btn-block"
            style={{ marginTop: 16 }}
            onClick={onManage}
          >
            Gestionar participantes
          </button>

          <button
            className="btn btn-ghost btn-block"
            style={{ marginTop: 8 }}
            onClick={onAdmin}
          >
            Gestionar Reto
          </button>
        </>
      )}

      {!loading && !error && users.length > 0 && (
        <>
          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, margin: '28px 0 10px' }}>
            Ranking
          </div>
          <Ranking onSelectUser={onVerHistorialDe} />
        </>
      )}

      {pinPendiente && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, zIndex: 50,
          }}
        >
          <div className="card" style={{ maxWidth: 320, width: '100%', textAlign: 'center' }}>
            <p style={{ marginTop: 0 }}>
              PIN de <strong>{pinPendiente.nombre}</strong>
            </p>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinIngresado}
              autoFocus
              onChange={(e) => { setPinIngresado(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmarPin(); }}
              style={{ marginBottom: 10, textAlign: 'center', fontSize: 22, letterSpacing: 8 }}
            />
            {pinError && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -4, marginBottom: 10 }}>{pinError}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" style={{ flex: 1 }} onClick={cancelarPin} disabled={verificando}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, opacity: verificando || pinIngresado.length !== 4 ? 0.5 : 1 }}
                onClick={confirmarPin}
                disabled={verificando || pinIngresado.length !== 4}
              >
                {verificando ? 'Verificando…' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
