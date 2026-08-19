import { useState, useEffect } from 'react';
import { listActiveUsers } from './usersApi';
import Avatar from './Avatar';

// ============================================================
// Pantalla de selección de perfil.
// Muestra los participantes activos como botones. Al tocar uno,
// se entra como ese usuario (honor system, sin contraseña).
// ============================================================

export default function ProfileSelect({ onSelect, onManage }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
                onClick={() => onSelect(u)}
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
        </>
      )}
    </div>
  );
}
