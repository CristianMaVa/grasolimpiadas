import { useState, useEffect } from 'react';
import { listActiveUsers, getPinConfig, verificarPin } from './usersApi';
import { getRetoConfig } from '../reto/retoApi';
import Avatar from './Avatar';
import Ranking from '../ranking/Ranking';

// ============================================================
// Pantalla de selección de perfil.
// Muestra los participantes activos como botones. Al tocar uno,
// se entra como ese usuario (honor system, sin contraseña).
// Debajo del header, el letrero de días restantes del reto (si ya
// se configuraron las fechas desde "Gestionar Reto" — si no, no se
// muestra nada). Más abajo, el ranking público — visible sin
// necesidad de elegir perfil, para que el último no pase
// desapercibido ni un segundo.
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

export default function ProfileSelect({ onSelect, onManage, onAdmin }) {
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
          <Ranking />
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
