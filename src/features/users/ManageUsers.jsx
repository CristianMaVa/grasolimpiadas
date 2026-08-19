import { useState, useEffect, useCallback } from 'react';
import {
  listAllUsers, createUser, updateUser,
  deactivateUser, reactivateUser, uploadAvatar,
} from './usersApi';
import Avatar from './Avatar';

// ============================================================
// Gestión de participantes.
// Crear, renombrar, desactivar (soft-delete) y reactivar.
// Los inactivos se muestran aparte para poder reincorporarlos
// sin perder su historial.
// ============================================================

export default function ManageUsers({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nuevo, setNuevo] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [subiendoFotoId, setSubiendoFotoId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAllUsers();
      setUsers(data);
      setError(null);
    } catch (e) {
      setError('No se pudieron cargar los participantes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activos = users.filter((u) => u.activo);
  const inactivos = users.filter((u) => !u.activo);

  async function handleAdd() {
    const nombre = nuevo.trim();
    if (!nombre) return;
    setSaving(true);
    try {
      await createUser({ nombre });
      setNuevo('');
      await load();
    } catch (e) {
      setError('No se pudo agregar. ¿Nombre repetido?');
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(id) {
    const nombre = editValue.trim();
    if (!nombre) return;
    try {
      await updateUser(id, { nombre });
      setEditId(null);
      setEditValue('');
      await load();
    } catch (e) {
      setError('No se pudo renombrar.');
    }
  }

  async function handleDeactivate(id) {
    try { await deactivateUser(id); await load(); }
    catch (e) { setError('No se pudo sacar del reto.'); }
  }

  async function handleReactivate(id) {
    try { await reactivateUser(id); await load(); }
    catch (e) { setError('No se pudo reincorporar.'); }
  }

  async function handleFoto(id, file) {
    if (!file) return;
    setSubiendoFotoId(id);
    setError(null);
    try {
      const url = await uploadAvatar(id, file);
      await updateUser(id, { avatarUrl: url });
      await load();
    } catch (e) {
      setError('No se pudo subir la foto.');
    } finally {
      setSubiendoFotoId(null);
    }
  }

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={onBack}>
          ← Volver
        </button>
        <h1 style={{ fontSize: 20, margin: 0 }}>Participantes</h1>
      </div>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          Nuevo competidor
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="Nombre"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={saving || !nuevo.trim()}
            style={{ opacity: saving || !nuevo.trim() ? 0.5 : 1 }}
          >
            Agregar
          </button>
        </div>
      </div>

      {loading && <p className="muted">Cargando…</p>}

      {!loading && (
        <>
          <SectionLabel>Activos · {activos.length}</SectionLabel>
          {activos.map((u) => (
            <Row key={u.id}>
              <FotoConEditor user={u} subiendo={subiendoFotoId === u.id} onFoto={(f) => handleFoto(u.id, f)} />
              {editId === u.id ? (
                <input
                  className="input"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(u.id); }}
                  style={{ flex: 1 }}
                />
              ) : (
                <span style={{ flex: 1, fontSize: 15 }}>{u.nombre}</span>
              )}

              {editId === u.id ? (
                <button className="btn btn-ghost" style={btnSm} onClick={() => handleRename(u.id)}>
                  Guardar
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-ghost"
                    style={btnSm}
                    onClick={() => { setEditId(u.id); setEditValue(u.nombre); }}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ ...btnSm, color: 'var(--danger)' }}
                    onClick={() => handleDeactivate(u.id)}
                  >
                    Sacar
                  </button>
                </>
              )}
            </Row>
          ))}

          {inactivos.length > 0 && (
            <>
              <SectionLabel>Fuera del reto · {inactivos.length}</SectionLabel>
              {inactivos.map((u) => (
                <Row key={u.id} dim>
                  <Avatar user={u} size={32} />
                  <span style={{ flex: 1, fontSize: 15 }}>{u.nombre}</span>
                  <button
                    className="btn btn-ghost"
                    style={btnSm}
                    onClick={() => handleReactivate(u.id)}
                  >
                    Reincorporar
                  </button>
                </Row>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

const btnSm = { padding: '6px 10px', fontSize: 13 };

function SectionLabel({ children }) {
  return (
    <div className="muted" style={{
      fontSize: 12, textTransform: 'uppercase', letterSpacing: 1,
      margin: '20px 0 8px',
    }}>
      {children}
    </div>
  );
}

function Row({ children, dim }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0', borderBottom: '1px solid var(--border)',
      opacity: dim ? 0.55 : 1,
    }}>
      {children}
    </div>
  );
}

// Avatar de un participante activo + botón para reemplazar la foto
function FotoConEditor({ user, subiendo, onFoto }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <Avatar user={user} size={32} />
      <label
        style={{
          position: 'absolute', bottom: -4, right: -4,
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, cursor: 'pointer',
        }}
      >
        {subiendo ? '…' : '📷'}
        <input
          type="file"
          accept="image/*"
          disabled={subiendo}
          style={{ display: 'none' }}
          onChange={(e) => { onFoto(e.target.files?.[0] ?? null); e.target.value = ''; }}
        />
      </label>
    </div>
  );
}
