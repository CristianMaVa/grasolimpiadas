import { useState, useEffect, useCallback, useMemo } from 'react';
import { listAllRules, crearRegla, actualizarRegla } from './rulesAdminApi';

// ============================================================
// Gestión de actividades (pantalla propia del módulo "Gestionar
// Reto", tras el PIN — ver AdminHome.jsx). Activar/desactivar, crear
// nuevas, ajustar puntos y si suman o restan. Desactivar NO borra la
// regla — solo la oculta del checklist de registro diario, así no se
// pierde el historial de quien ya la registró. Editar puntos/tipo
// tampoco reescribe el pasado: entry_items guarda su propia copia al
// momento de marcarse. De momento no se gestionan límite por
// categoría ni grupo exclusivo desde aquí — decisión explícita, se
// trabaja después.
// ============================================================

export default function ManageRules({ onBack }) {
  const [reglas, setReglas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [puntos, setPuntos] = useState('');
  const [tipo, setTipo] = useState('suma');
  const [creando, setCreando] = useState(false);

  const [editKey, setEditKey] = useState(null);
  const [editPuntos, setEditPuntos] = useState('');
  const [editTipo, setEditTipo] = useState('suma');
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const [cambiandoActivo, setCambiandoActivo] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAllRules();
      setReglas(data);
      setError(null);
    } catch (e) {
      setError('No se pudieron cargar las actividades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categoriasExistentes = useMemo(
    () => [...new Set(reglas.map((r) => r.categoria))],
    [reglas]
  );

  const grupos = useMemo(() => {
    const orden = [];
    const mapa = {};
    for (const r of reglas) {
      if (!mapa[r.categoria]) { mapa[r.categoria] = []; orden.push(r.categoria); }
      mapa[r.categoria].push(r);
    }
    return orden.map((cat) => ({ categoria: cat, items: mapa[cat] }));
  }, [reglas]);

  const puntosNum = parseInt(puntos, 10);
  const puedeCrear = categoria.trim() && descripcion.trim() && puntosNum > 0;

  async function handleCrear() {
    if (!puedeCrear) return;
    setCreando(true);
    setError(null);
    try {
      await crearRegla({ categoria: categoria.trim(), descripcion: descripcion.trim(), puntos: puntosNum, tipo });
      setCategoria('');
      setDescripcion('');
      setPuntos('');
      setTipo('suma');
      await load();
    } catch (e) {
      setError('No se pudo crear la actividad.');
    } finally {
      setCreando(false);
    }
  }

  async function handleToggleActivo(regla) {
    setCambiandoActivo(regla.regla_key);
    setError(null);
    try {
      await actualizarRegla(regla.regla_key, { activo: !regla.activo });
      await load();
    } catch (e) {
      setError('No se pudo actualizar la actividad.');
    } finally {
      setCambiandoActivo(null);
    }
  }

  function empezarEdicion(regla) {
    setEditKey(regla.regla_key);
    setEditPuntos(String(Math.abs(regla.puntos)));
    setEditTipo(regla.tipo);
  }

  const editPuntosNum = parseInt(editPuntos, 10);

  async function handleGuardarEdicion() {
    if (!(editPuntosNum > 0)) return;
    setGuardandoEdit(true);
    setError(null);
    try {
      const puntosFirmados = editTipo === 'resta' ? -editPuntosNum : editPuntosNum;
      await actualizarRegla(editKey, { puntos: puntosFirmados, tipo: editTipo });
      setEditKey(null);
      await load();
    } catch (e) {
      setError('No se pudo guardar el cambio.');
    } finally {
      setGuardandoEdit(false);
    }
  }

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={onBack}>
          ← Volver
        </button>
        <h1 style={{ fontSize: 20, margin: 0 }}>Actividades</h1>
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          Nueva actividad
        </label>
        <input
          className="input"
          list="categorias-existentes"
          placeholder="Categoría"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <datalist id="categorias-existentes">
          {categoriasExistentes.map((c) => <option key={c} value={c} />)}
        </datalist>
        <input
          className="input"
          placeholder="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="input"
            type="number"
            min="1"
            placeholder="Puntos"
            value={puntos}
            onChange={(e) => setPuntos(e.target.value)}
            style={{ flex: 1 }}
          />
          <TipoToggle tipo={tipo} onChange={setTipo} />
        </div>
        <button
          className="btn btn-primary btn-block"
          onClick={handleCrear}
          disabled={creando || !puedeCrear}
          style={{ opacity: creando || !puedeCrear ? 0.5 : 1 }}
        >
          {creando ? 'Creando…' : 'Agregar actividad'}
        </button>
      </div>

      {loading && <p className="muted">Cargando…</p>}

      {!loading && grupos.map(({ categoria: cat, items }) => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            {cat}
          </div>
          {items.map((r) => (
            <div key={r.regla_key} className="card" style={{ marginBottom: 8, opacity: r.activo ? 1 : 0.5 }}>
              {editKey === r.regla_key ? (
                <div>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>{r.descripcion}</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={editPuntos}
                      onChange={(e) => setEditPuntos(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <TipoToggle tipo={editTipo} onChange={setEditTipo} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" style={{ flex: 1 }} onClick={() => setEditKey(null)} disabled={guardandoEdit}>
                      Cancelar
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, opacity: guardandoEdit || !(editPuntosNum > 0) ? 0.5 : 1 }}
                      onClick={handleGuardarEdicion}
                      disabled={guardandoEdit || !(editPuntosNum > 0)}
                    >
                      {guardandoEdit ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, flex: 1 }}>
                    {r.descripcion}
                    {!r.activo && <span className="muted" style={{ fontSize: 12 }}> — desactivada</span>}
                  </span>
                  <span style={{ fontWeight: 700, color: r.puntos > 0 ? 'var(--accent)' : 'var(--danger)' }}>
                    {r.puntos > 0 ? `+${r.puntos}` : r.puntos}
                  </span>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '6px 10px', fontSize: 13 }}
                    onClick={() => empezarEdicion(r)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '6px 10px', fontSize: 13, color: r.activo ? 'var(--danger)' : 'var(--success)' }}
                    onClick={() => handleToggleActivo(r)}
                    disabled={cambiandoActivo === r.regla_key}
                  >
                    {r.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TipoToggle({ tipo, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button
        className="btn"
        type="button"
        onClick={() => onChange('suma')}
        style={{
          padding: '10px 12px', fontSize: 13,
          background: tipo === 'suma' ? 'var(--success)' : 'var(--surface-2)',
          borderColor: tipo === 'suma' ? 'var(--success)' : 'var(--border)',
        }}
      >
        Suma
      </button>
      <button
        className="btn"
        type="button"
        onClick={() => onChange('resta')}
        style={{
          padding: '10px 12px', fontSize: 13,
          background: tipo === 'resta' ? 'var(--danger)' : 'var(--surface-2)',
          borderColor: tipo === 'resta' ? 'var(--danger)' : 'var(--border)',
        }}
      >
        Resta
      </button>
    </div>
  );
}
