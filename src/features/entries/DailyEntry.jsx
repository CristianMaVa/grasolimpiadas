import { useState, useEffect, useCallback, useMemo } from 'react';
import { listCheckableRules } from './rulesApi';
import {
  getEntryForDate, countComidaLibreEnSemana,
  registrarActividad, actualizarComodin, actualizarComidaLibre, ajustarComodines,
} from './entriesApi';
import ItemRow from './ItemRow';

// ============================================================
// Registro diario — modelo incremental (ajustado post-deploy).
// El grupo no registra todo de una vez al final del día, sino
// de a pocos según pasan las cosas. Por eso esta pantalla ya no
// es "marcar todo y guardar": es elegir UNA actividad del
// selector, adjuntar foto si aplica (obligatoria en suma, no en
// resta), y registrarla — se guarda al toque. Cada regla se
// puede registrar máximo una vez por día; una vez registrada,
// el selector la muestra deshabilitada. Editable para el día
// actual y días pasados (selector de fecha).
// ============================================================

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyEntry({ profile, onUpdateProfile, fechaInicial }) {
  const [fecha, setFecha] = useState(fechaInicial || hoyISO());
  const [reglas, setReglas] = useState([]);
  const [marcadas, setMarcadas] = useState([]);
  const [evidenciaExistente, setEvidenciaExistente] = useState({}); // { regla_key: [{id, foto_url}] }
  const [comodinUsado, setComodinUsado] = useState(false);
  const [comidaLibreUsada, setComidaLibreUsada] = useState(false);
  const [otrasComidasLibres, setOtrasComidasLibres] = useState(0);
  const [puntosNetos, setPuntosNetos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reglaSeleccionada, setReglaSeleccionada] = useState('');
  const [fotosSeleccionadas, setFotosSeleccionadas] = useState([]);
  const [registrando, setRegistrando] = useState(false);
  const [guardandoFlag, setGuardandoFlag] = useState(null); // 'comodin' | 'comidaLibre' | null

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listCheckableRules();
        if (alive) setReglas(data);
      } catch (e) {
        if (alive) setError('No se pudo cargar el reglamento.');
      }
    })();
    return () => { alive = false; };
  }, []);

  const cargarDia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { entry, reglaKeys, evidenciaPorRegla } = await getEntryForDate(profile.id, fecha);
      setMarcadas(reglaKeys);
      setEvidenciaExistente(evidenciaPorRegla ?? {});
      setComodinUsado(entry?.comodin_usado ?? false);
      setComidaLibreUsada(entry?.comida_libre_usada ?? false);
      setPuntosNetos(entry?.puntos_netos ?? 0);
      setReglaSeleccionada('');
      setFotosSeleccionadas([]);
      const otras = await countComidaLibreEnSemana(profile.id, fecha, entry?.id ?? null);
      setOtrasComidasLibres(otras);
    } catch (e) {
      setError('No se pudo cargar el día.');
    } finally {
      setLoading(false);
    }
  }, [profile.id, fecha]);

  useEffect(() => { cargarDia(); }, [cargarDia]);

  const categorias = useMemo(() => {
    const orden = [];
    const grupos = {};
    for (const r of reglas) {
      if (!grupos[r.categoria]) { grupos[r.categoria] = []; orden.push(r.categoria); }
      grupos[r.categoria].push(r);
    }
    return orden.map((categoria) => ({ categoria, items: grupos[categoria] }));
  }, [reglas]);

  const itemsRegistrados = useMemo(
    () => reglas
      .filter((r) => marcadas.includes(r.regla_key))
      .map((r) => ({ ...r, fotos: evidenciaExistente[r.regla_key] ?? [] })),
    [reglas, marcadas, evidenciaExistente]
  );

  const reglaActual = reglas.find((r) => r.regla_key === reglaSeleccionada) ?? null;
  const requiereEvidencia = reglaActual?.tipo === 'suma';
  const puedeRegistrar = !!reglaActual && (!requiereEvidencia || fotosSeleccionadas.length > 0);

  const comodinesDisponibles = profile.comodines_restantes ?? 2;
  const puedeActivarComodin = comodinUsado || comodinesDisponibles > 0;
  const puedeActivarComidaLibre = comidaLibreUsada || otrasComidasLibres < 1;

  async function handleToggleComodin() {
    const nuevoValor = !comodinUsado;
    setGuardandoFlag('comodin');
    setError(null);
    try {
      const { puntosNetos: nuevoNeto } = await actualizarComodin(profile.id, fecha, nuevoValor);
      const delta = nuevoValor ? -1 : 1;
      const userActualizado = await ajustarComodines(profile.id, delta);
      onUpdateProfile({ comodines_restantes: userActualizado.comodines_restantes });
      setComodinUsado(nuevoValor);
      setPuntosNetos(nuevoNeto);
    } catch (e) {
      setError('No se pudo actualizar el comodín.');
    } finally {
      setGuardandoFlag(null);
    }
  }

  async function handleToggleComidaLibre() {
    const nuevoValor = !comidaLibreUsada;
    setGuardandoFlag('comidaLibre');
    setError(null);
    try {
      const { puntosNetos: nuevoNeto } = await actualizarComidaLibre(profile.id, fecha, nuevoValor);
      setComidaLibreUsada(nuevoValor);
      setPuntosNetos(nuevoNeto);
    } catch (e) {
      setError('No se pudo actualizar la comida libre.');
    } finally {
      setGuardandoFlag(null);
    }
  }

  async function handleRegistrar() {
    if (!puedeRegistrar || !reglaActual) return;
    setRegistrando(true);
    setError(null);
    try {
      const { puntosNetos: nuevoNeto } = await registrarActividad({
        userId: profile.id,
        fecha,
        regla: reglaActual,
        fotos: fotosSeleccionadas,
      });
      setMarcadas((prev) => [...prev, reglaActual.regla_key]);
      setPuntosNetos(nuevoNeto);
      setReglaSeleccionada('');
      setFotosSeleccionadas([]);
    } catch (e) {
      setError('No se pudo registrar la actividad.');
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          Día
        </label>
        <input
          type="date"
          className="input"
          value={fecha}
          max={hoyISO()}
          onChange={(e) => setFecha(e.target.value)}
        />
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && (
        <>
          <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 14 }}>Neto del día</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: puntosNetos < 0 ? 'var(--danger)' : 'var(--accent)' }}>
              {puntosNetos > 0 ? `+${puntosNetos}` : puntosNetos}
            </span>
          </div>

          <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
            <Toggle
              label={`Comodín (${comodinesDisponibles} disponible${comodinesDisponibles === 1 ? '' : 's'})`}
              activo={comodinUsado}
              disabled={!puedeActivarComodin || guardandoFlag !== null}
              onClick={handleToggleComodin}
            />
            <Toggle
              label="Comida libre"
              activo={comidaLibreUsada}
              disabled={!puedeActivarComidaLibre || guardandoFlag !== null}
              onClick={handleToggleComidaLibre}
            />
          </div>
          {comodinUsado && (
            <p className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              Comodín activo: el día queda en 0 pts, sin importar lo que registres abajo.
            </p>
          )}
          {!puedeActivarComidaLibre && (
            <p className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              Ya usaste tu comida libre de la semana.
            </p>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              Registrar una actividad
            </label>
            <select
              className="input"
              value={reglaSeleccionada}
              onChange={(e) => { setReglaSeleccionada(e.target.value); setFotosSeleccionadas([]); }}
              style={{ marginBottom: 10 }}
            >
              <option value="">Elige una actividad…</option>
              {categorias.map(({ categoria, items }) => (
                <optgroup key={categoria} label={categoria}>
                  {items.map((r) => {
                    const yaHecha = marcadas.includes(r.regla_key);
                    return (
                      <option key={r.regla_key} value={r.regla_key} disabled={yaHecha}>
                        {r.descripcion} ({r.puntos > 0 ? `+${r.puntos}` : r.puntos}){yaHecha ? ' — ya registrada' : ''}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>

            {reglaActual && requiereEvidencia && (
              <div style={{ marginBottom: 10 }}>
                <label className="btn btn-ghost" style={{ fontSize: 13, display: 'inline-flex' }}>
                  📷 {fotosSeleccionadas.length > 0 ? 'Cambiar foto' : 'Subir o tomar foto'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => { setFotosSeleccionadas(Array.from(e.target.files)); e.target.value = ''; }}
                  />
                </label>
                <span
                  className="muted"
                  style={{ fontSize: 12, marginLeft: 8, color: fotosSeleccionadas.length === 0 ? 'var(--danger)' : undefined }}
                >
                  {fotosSeleccionadas.length === 0
                    ? 'Falta foto (obligatoria)'
                    : `${fotosSeleccionadas.length} foto${fotosSeleccionadas.length === 1 ? '' : 's'} lista${fotosSeleccionadas.length === 1 ? '' : 's'}`}
                </span>
              </div>
            )}

            <button
              className="btn btn-primary btn-block"
              onClick={handleRegistrar}
              disabled={!puedeRegistrar || registrando}
              style={{ opacity: !puedeRegistrar || registrando ? 0.5 : 1 }}
            >
              {registrando ? 'Registrando…' : 'Registrar'}
            </button>
          </div>

          <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Ya registraste hoy · {itemsRegistrados.length}
          </div>

          {itemsRegistrados.length === 0 && (
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="muted" style={{ margin: 0 }}>Nada registrado todavía este día.</p>
            </div>
          )}

          {itemsRegistrados.map((item) => (
            <ItemRow key={item.regla_key} descripcion={item.descripcion} puntos={item.puntos} fotos={item.fotos} />
          ))}
        </>
      )}
    </div>
  );
}

function Toggle({ label, activo, disabled, onClick }) {
  return (
    <button
      className="btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, fontSize: 13, padding: '10px 8px',
        background: activo ? 'var(--accent)' : 'var(--surface-2)',
        borderColor: activo ? 'var(--accent)' : 'var(--border)',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}
